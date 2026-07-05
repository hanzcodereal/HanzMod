import axios from 'axios';
import * as cheerio from 'cheerio';
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
  const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
  const targetUrl = page === 1 ? 'https://an1.com/tags/mods/' : `https://an1.com/tags/mods/page/${page}/`;
  const cacheKey = 'home_' + page;
  const cached = getCached(cacheKey);
  if (cached) return json(cached);

  try {
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const results: any[] = [];

    $('.item .item_app').each((_, el) => {
      const link = $(el).find('.name a').first();
      const href = link.attr('href') || '';
      const title = link.attr('title') || link.text().trim();
      const img = $(el).find('.img img').attr('src') || '';
      const developer = $(el).find('.developer').text().trim();
      const ratingWidth = $(el).find('.current-rating').attr('style') || '';
      const ratingMatch = ratingWidth.match(/width:(\d+)%/);
      const ratingNum = ratingMatch?.[1] ? parseInt(ratingMatch[1]) / 20 : 0;

      const idMatch = href.match(/\/(\d+)-/);
      const id = idMatch ? idMatch[1] : '';

      if (title && href) {
        results.push({
          id,
          title,
          url: href.startsWith('https://') ? href : 'https://an1.com' + href,
          thumbnail: img.startsWith('https://') ? img : 'https://an1.com' + img,
          developer,
          rating: ratingNum || 0,
        });
      }
    });

    const lastPage = $('.navigation_ext .pages a').last().text().trim();
    const totalPages = parseInt(lastPage) || 1;
    const currentPageText = $('.navigation_ext .pages span').first().text().trim();
    const currentPage = currentPageText ? parseInt(currentPageText) : page;

    const resp = {
      status: true,
      creator: 'Hanzz',
      result: {
        page: currentPage,
        total_pages: totalPages,
        total_items: results.length,
        games: results,
      },
    };

    setCached(cacheKey, resp);
    return json(resp);
  } catch (err: any) {
    return json({ status: false, creator: 'Hanzz', message: err.message }, 500);
  }
};

export const config: Config = { path: '/api/home' };
