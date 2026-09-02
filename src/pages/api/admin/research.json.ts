import { canManageAi, canPublish, parseCookies, resolveAdmin } from '../../../lib/auth';
import { getDb, upsertPost, validatePublish } from '../../../lib/posts';
import { getThemeSettings } from '../../../lib/settings';
import { mergeExtractedPost, runResearchFetch } from '../../../lib/research';
import { getResearchCrawlState, runResearchWorker } from '../../../lib/research-worker';
import type { Post } from '../../../lib/types';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'DB unavailable' }, 503);
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedCron = locals.runtime?.env?.AI_CRON_SECRET;
  const isCron = !!(expectedCron && cronSecret && cronSecret === expectedCron);

  if (!isCron && (!user || !canManageAi(user.role))) return json({ error: 'Forbidden' }, 403);

  const theme = await getThemeSettings(db);
  const ai = locals.runtime?.env?.AI;

  if (action === 'fetch' || action === 'cron') {
    if (action === 'cron') {
      const result = await runResearchWorker(db, ai, {
        force: Boolean(body.force),
        createdBy: user?.email || 'admin-cron'
      });
      return json({ success: true, ...result });
    }
    const urls: string[] = [String(body.url || '')];
    const created = await runResearchFetch(db, ai, theme, urls, user?.email || 'cron');
    return json({ success: true, created });
  }

  if (action === 'status') {
    const state = await getResearchCrawlState(db);
    return json({ success: true, ...state });
  }

  if (action === 'approve' || action === 'reject') {
    if (!user || !canPublish(user.role)) return json({ error: 'Editors/owners only for approve' }, 403);
    const id = Number(body.id);
    const row = await db.prepare(`SELECT * FROM ai_drafts WHERE id = ?`).bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    if (action === 'reject') {
      await db.prepare(`UPDATE ai_drafts SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
      return json({ success: true });
    }
    const extracted = JSON.parse(String(row.extracted_json));
    const post = mergeExtractedPost(extracted, String(row.raw_source_url), user.email);
    post.status = 'published';
    post.published_at = new Date().toISOString();
    const errors = validatePublish(post, theme.allowlistDomains);
    if (errors.length) return json({ error: errors.join(' ') }, 400);
    await upsertPost(db, post);
    await db.prepare(`UPDATE ai_drafts SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();
    return json({ success: true, slug: post.slug });
  }

  return json({ error: 'Unknown action' }, 400);
};
