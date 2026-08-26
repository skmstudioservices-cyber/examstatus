import examsData from '../../../data/exams.json';
import { parseCookies, resolveAdmin, canPublish } from '../../../lib/auth';
import { getDb, upsertPost } from '../../../lib/posts';
import { enrichSeedPost } from '../../../lib/seed';
import { DEFAULT_THEME } from '../../../lib/types';
import { saveThemeSettings } from '../../../lib/settings';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user || !canPublish(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  let count = 0;
  for (const raw of examsData as Record<string, unknown>[]) {
    const post = enrichSeedPost(raw);
    post.created_by = user.email;
    await upsertPost(db, post);
    count++;
  }
  await saveThemeSettings(db, DEFAULT_THEME);
  return new Response(JSON.stringify({ success: true, count }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
