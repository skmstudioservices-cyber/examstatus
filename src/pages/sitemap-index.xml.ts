import { getDb } from '../lib/posts';
import { loadPublished } from '../lib/load';

export const prerender = false;

export async function GET({ url, locals }: { url: URL; locals: App.Locals }) {
  const db = getDb(locals);
  const base = `${url.protocol}//${url.host}`;
  const posts = await loadPublished(db);
  const staticPaths = [
    '/',
    '/about',
    '/privacy-policy',
    '/terms',
    '/contact',
    '/national',
    '/state',
    '/category/latest-jobs',
    '/category/admit-cards',
    '/category/results',
    '/category/answer-keys',
    '/category/syllabus'
  ];

  const examUrls = posts
    .map(
      (exam) =>
        `  <url>\n    <loc>${base}/exam/${exam.slug}</loc>\n    <lastmod>${exam.last_verified_at || exam.start_date || ''}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
    .join('\n');

  const staticUrls = staticPaths
    .map(
      (path) =>
        `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.5'}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${examUrls}\n</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=300' }
  });
}
