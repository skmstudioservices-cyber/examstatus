import { defineMiddleware } from 'astro:middleware';

/**
 * Geo guard (3 Nov 2026, user rule): India-only traffic.
 * Every request from outside India is refused EXCEPT the Google indexing
 * crawlers (they crawl from US IPs and must stay allowed, or the site can
 * never be indexed). Cached for a year so repeat offenders cost zero CPU.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const cf: any = (context.request as any).cf || {};
  const country = String(cf.country || '');
  const ua = context.request.headers.get('user-agent') || '';
  const isGoogleIndexer =
    /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|apis-google|googleother|storebot-google/i.test(ua);

  if (country && country !== 'IN' && !isGoogleIndexer) {
    return new Response('Not available in your region', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-robots-tag': 'noindex',
      },
    });
  }
  return next();
});
