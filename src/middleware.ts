import { defineMiddleware } from 'astro:middleware';

/**
 * Geo guard (3 Nov 2026, user rule): India-only traffic.
 * Refused outside India EXCEPT:
 *   - search-index crawlers (Google + Bing) - required for indexing
 *   - chat-retrieval agents (Claude-User, ChatGPT-User, OAI-SearchBot,
 *     Claude-SearchBot, Perplexity-User) - one fetch per human action
 * Training-only bots (GPTBot, ClaudeBot, CCBot...) are NOT allowed.
 * Cached for a year so repeat offenders cost zero CPU.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const cf: any = (context.request as any).cf || {};
  const country = String(cf.country || '');
  const ua = context.request.headers.get('user-agent') || '';
  const isAllowedCrawler =
    /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|apis-google|googleother|storebot-google|bingbot|msnbot|adidxbot|claude-user|claude-searchbot|chatgpt-user|oai-searchbot|perplexity-user/i.test(ua);

  if (country && country !== 'IN' && !isAllowedCrawler) {
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
