export const prerender = false;
import type { APIRoute } from 'astro';
import { urlset, toLastmod, type UrlEntry } from '../lib/sitemap';
import { TOOLS, GAME_LISTS } from '../lib/site-data';

export const GET: APIRoute = () => {
  const today = toLastmod();

  const core: UrlEntry[] = [
    { loc: '/',                   priority: 1.0, changefreq: 'daily',   lastmod: today },
    { loc: '/games',              priority: 0.9, changefreq: 'daily',   lastmod: today },
    { loc: '/tools',              priority: 0.9, changefreq: 'weekly',  lastmod: today },
    { loc: '/gpus',               priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/cpus',               priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/benchmarks',         priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/game-lists',         priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/blog',               priority: 0.8, changefreq: 'weekly',  lastmod: today }
  ];

  const tools: UrlEntry[] = TOOLS.map(t => ({
    loc: t.href, priority: 0.9, changefreq: 'weekly' as const, lastmod: today
  }));

  const lists: UrlEntry[] = GAME_LISTS.map(l => ({
    loc: `/game-list/${l.slug}`, priority: 0.7, changefreq: 'weekly' as const, lastmod: today
  }));

  const info: UrlEntry[] = [
    { loc: '/about',               priority: 0.5, changefreq: 'monthly', lastmod: today },
    { loc: '/contact',             priority: 0.4, changefreq: 'yearly',  lastmod: today },
    { loc: '/editorial-standards', priority: 0.5, changefreq: 'yearly',  lastmod: today },
    { loc: '/privacy',             priority: 0.3, changefreq: 'yearly',  lastmod: today },
    { loc: '/terms',               priority: 0.3, changefreq: 'yearly',  lastmod: today }
  ];

  // De-duplicate: TOOLS already contains several of the core tool routes.
  const seen = new Set<string>();
  const all = [...core, ...tools, ...lists, ...info].filter(e => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  return urlset(all);
};
