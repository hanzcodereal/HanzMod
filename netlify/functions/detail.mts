import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Config } from '@netlify/functions';

// cache biar ga nge-scrape terus
const apiCache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

function getCached(key: string) {
  const item = apiCache.get(key);
  if (item && Date.now() - item.time < CACHE_TTL) return item.data;
  return null;
}

function setCached(key: string, data: unknown) {
  apiCache.set(key, { data, time: Date.now() });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// user agent random biar ga kedetect bot
const UA = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.6099.144 Mobile Safari/537.36',
];

async function fetchAn1(url: string) {
  const { data } = await axios.get(url, {
    headers: { 
      'User-Agent': UA[Math.floor(Math.random() * UA.length)], 
      'Accept': 'text/html', 
      'Origin': 'https://an1.com' 
    },
    timeout: 30000,
    maxRedirects: 5,
  });
  return data as string;
}

export default async (req: Request) => {
  // proteksi biar ga discrape orang lain
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return json({ status: false, message: 'Forbidden. API is protected from scraping.' }, 403);
  }

  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim();
  const cacheKey = 'detail_' + id;
  
  // cek cache dulu
  const cached = getCached(cacheKey);
  if (cached) return json(cached);
  
  // validasi id harus angka
  if (!id || !/^\d+$/.test(id)) {
    return json({ status: false, creator: 'Hanzz', message: 'ID harus angka' }, 400);
  }

  try {
    let mainHtml = '';
    let mainUrl = '';
    
    // coba beberapa kemungkinan url
    for (const u of [`https://an1.com/${id}-game.html`, `https://an1.com/${id}-mod.html`, `https://an1.com/${id}-apk.html`]) {
      try {
        mainHtml = await fetchAn1(u);
        mainUrl = u;
        break;
      } catch (e) {
        // lanjut ke url berikutnya
      }
    }

    // kalo ga ketemu, coba dari halaman download
    if (!mainHtml) {
      try {
        const dw = await fetchAn1(`https://an1.com/file_${id}-dw.html`);
        const m = dw.match(/<a[^>]*class="[^"]*btn-back[^"]*"[^>]*href="([^"]+)"[^>]*>/);
        if (m) {
          const bu = m[1].startsWith('https://') ? m[1] : 'https://an1.com' + m[1];
          mainHtml = await fetchAn1(bu);
          mainUrl = bu;
        }
      } catch (e) {
        // udah ga ada cara lain
      }
    }

    const $m = cheerio.load(mainHtml || '<html></html>');
    
    // ambil developer dari berbagai kemungkinan selector
    let developer = '';
    const devSelectors = [
      '.developer a',
      '.info-item:contains("Developer") a',
      'li:contains("Developer") a',
      '.app-developer a',
      '.game-developer a'
    ];
    
    for (const sel of devSelectors) {
      const el = $m(sel).first();
      if (el.length) {
        developer = el.text().trim();
        break;
      }
    }
    
    // kalo ga ketemu pake regex
    if (!developer) {
      const match = mainHtml?.match(/Developer:\s*<\/b>\s*<a[^>]*>([^<]+)</);
      if (match) developer = match[1].trim();
    }
    
    // default Unknown
    if (!developer) developer = 'Unknown';

    // ambil title
    let title = $m('h1').first().text().trim();
    if (!title) title = $m('.app-title').first().text().trim();
    if (!title) title = $m('.game-title').first().text().trim();

    const result: any = {
      id,
      title: title || 'Unknown',
      version: (mainHtml?.match(/Version:\s*<\/b>\s*([\d.]+)/) || [])[1] || '',
      developer: developer,
      category: (mainHtml?.match(/Category:\s*<\/b>\s*<a[^>]*>([^<]+)</) || [])[1]?.trim() || '',
      description:
        $m('.full-text p, article p, .description p').map((_: any, e: any) => $m(e).text().trim()).get().join(' ') ||
        $m('meta[name="description"]').attr('content') ||
        '',
      thumbnail: $m('.app-icon img, .img-block img, .game-icon img').first().attr('src') || '',
      screenshots: [] as string[],
      features: [] as string[],
      mod_info: (mainHtml?.match(/MOD(?: Features| Info)?:?\s*<\/b>(.*?)(?:<br|<p|<\/p|\n\n)/s) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '',
      google_play_url: (mainHtml?.match(/href="(https:\/\/play\.google\.com\/store\/apps\/details\?id=[^"]+)"/) || [])[1] || '',
      main_page_url: mainUrl,
      // tambahan field buat info text
      info_text: '',
      app_size: '',
      android_version: '',
      updated_date: '',
    };

    // ambil screenshot
    $m('.screenshots img, .screen img, .gallery img').each((_: any, e: any) => {
      const s = $m(e).attr('src');
      if (s && s !== result.thumbnail) result.screenshots.push(s);
    });

    // ambil fitur2
    $m('.features li, ul.mod-features li, .game-features li').each((_: any, e: any) => {
      const text = $m(e).text().trim();
      if (text) result.features.push(text);
    });

    // ambil data dari halaman download
    try {
      const dwHtml = await fetchAn1(`https://an1.com/file_${id}-dw.html`);
      const $d = cheerio.load(dwHtml);
      
      // ambil url download
      let dwHref = $d('#pre_download').attr('href') || '';
      if (dwHref && !dwHref.startsWith('http')) {
        dwHref = 'https://an1.com' + dwHref;
      }
      result.download_url = dwHref;

      // ambil ukuran file dari li#a_size
      const sizeText = $d('li#a_size').text().trim();
      if (sizeText) {
        result.app_size = sizeText.replace(/Size:/i, '').trim();
      } else {
        // fallback ke download button
        const sizeMatch = dwHtml.match(/<a[^>]*id="pre_download"[^>]*>.*?\(([\d.]+\s*(?:Mb|MB|GB|Kb))\)/s);
        if (sizeMatch) result.app_size = sizeMatch[1];
        else result.app_size = 'Unknown';
      }

      // ambil versi android dari li#a_ver
      const verText = $d('li#a_ver').text().trim();
      if (verText) {
        const cleanVer = verText.replace(/Version:|Android/i, '').trim();
        result.android_version = cleanVer;
      } else {
        result.android_version = 'Unknown';
      }

      // ambil tanggal update dari li#a_date
      const dateText = $d('li#a_date').text().trim();
      if (dateText) {
        result.updated_date = dateText.replace(/Updated:|Date:/i, '').trim();
      }

      // gabungin jadi satu string kayak gini: "Unknown 217.3Mb Android 5.0+"
      const size = result.app_size || 'Unknown';
      const android = result.android_version || '';
      result.info_text = [result.developer, size, android].filter(Boolean).join(' ');

      // ambil link lain
      result.an1_store_url = $d('a.an1-mobile-download').attr('href') || '';
      result.pc_emulator_url = $d('a[href*="ldplayer"]').attr('href') || '';
      
      // update title & thumbnail dari halaman download
      const dwTitle = $d('h1.title').first().text().trim();
      if (dwTitle) result.title = dwTitle;
      
      const dwThumb = $d('.box-file-img img').first().attr('src');
      if (dwThumb) result.thumbnail = dwThumb;

      // ambil timer kalo ada
      const timerMatch = dwHtml.match(/countdown\((\d+)\)/);
      if (timerMatch) result.timer_seconds = parseInt(timerMatch[1]);

    } catch (e) {
      // kalo gagal ambil halaman download, pake data seadanya
      result.info_text = [result.developer, 'Unknown', ''].filter(Boolean).join(' ');
    }

    // safety net
    if (!result.info_text) {
      result.info_text = [result.developer, result.app_size || 'Unknown', result.android_version || ''].filter(Boolean).join(' ');
    }

    const resp = { status: true, creator: 'Hanzz', input: { id }, result };
    setCached(cacheKey, resp);
    return json(resp);
  } catch (err: any) {
    return json({ status: false, creator: 'Hanzz', message: err.message }, 500);
  }
};

export const config: Config = { path: '/api/detail' };