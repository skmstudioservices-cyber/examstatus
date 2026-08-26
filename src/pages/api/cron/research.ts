import { getDb } from '../../../lib/posts';
import { getThemeSettings } from '../../../lib/settings';
import { runResearchFetch } from '../../../lib/research';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const expected = locals.runtime?.env?.AI_CRON_SECRET;
  const got = request.headers.get('x-cron-secret');
  if (!expected || !got || got !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const db = getDb(locals);
  if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });
  const theme = await getThemeSettings(db);
  const ai = locals.runtime?.env?.AI;
  const urls = theme.allowlistDomains.slice(0, 5).map((d) => `https://${d}/`);
  const created = await runResearchFetch(db, ai, theme, urls, 'cron');
  return new Response(JSON.stringify({ success: true, created }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
