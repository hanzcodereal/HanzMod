import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'querystring';
import type { Config } from '@netlify/functions';

const apiCache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 10 * 60 * 1000;

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

export default async (req: Request) => {
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return json({ status: false, message: 'Forbidden. API is protected from scraping.' }, 403);
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get('query') || '').trim();
  const cacheKey = 'search_' + query;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);
  if (!query) {
    return json({ status: false, creator: 'Hanzz', message: 'Parameter query wajib diisi' }, 400);
  }

  try {
    const { data } = await axios.post(
      'https://an1.com/index.php?do=search',
      qs.stringify({ do: 'search', subaction: 'search', story: query, search_start: 0, full_search: 0, result_from: 1 }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://an1.com',
          Referer: 'https://an1.com/index.php?do=search',
        },
        timeout: 30000,
      }
    );

    const $ = cheerio.load(data);
    const totalMatch = data.match(/Found (\d+) (?:apps|games|results)/);
    const total = parseInt(totalMatch?.[1] || '0');

    let pages = 1;
    $('button.uppercase').each((_, el) => {
      const m = $(el).text().match(/of (\d+)/);
      if (m) pages = parseInt(m[1]);
    });

    const results: any[] = [];
    $('.item_app').each((_, el) => {
      const link = $(el).find('.name a').first();
      const href = link.attr('href') || '';
      const fullUrl = href.startsWith('https://') ? href : 'https://an1.com' + href;
      const idMatch = fullUrl.match(/\/(\d+)-/);
      const thumbnail = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
      const developer = $(el).find('.developer').text().trim();
      const rating = $(el).find('.current-rating').text().trim();

      if (link.length && href) {
        results.push({ id: idMatch?.[1] || '', title: link.attr('title') || link.text().trim(), url: fullUrl, thumbnail, developer, rating });
      }
    });

    const resp = { status: true, creator: 'Hanzz', input: { query }, result: { query, total, pages, results } };
    setCached(cacheKey, resp);
    return json(resp);
  } catch (err: any) {
    return json({ status: false, creator: 'Hanzz', message: err.message }, 500);
  }
};

export const config: Config = { path: '/api/search' };
