import examsData from '../data/exams.json';

export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const base = `${url.protocol}//${url.host}`;
  const staticPaths = ['/', '/about', '/privacy-policy', '/terms', '/contact'];

  const examUrls = (examsData as any[]).map((exam) => {
    return `  <url>\n    <loc>${base}/exam/${exam.slug}</loc>\n    <lastmod>${exam.startDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  }).join('\n');

  const staticUrls = staticPaths.map((path) => {
    return `  <url>\n    <loc>${base}${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.4'}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${examUrls}\n</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
