import { getDb, upsertPost, validatePublish } from '../../../lib/posts';
import { parseCookies, resolveAdmin, canPublish } from '../../../lib/auth';
import type { Post } from '../../../lib/types';
import { getThemeSettings } from '../../../lib/settings';
import { DEFAULT_THEME } from '../../../lib/types';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function requireAdmin(locals: App.Locals, request: Request) {
  const db = getDb(locals);
  if (!db) return { error: json({ error: 'Database unavailable' }, 503) };
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) };
  return { db, user };
}

export const GET: import('astro').APIRoute = async ({ locals, request, url }) => {
  const auth = await requireAdmin(locals, request);
  if ('error' in auth) return auth.error;
  const slug = url.searchParams.get('slug');
  if (slug) {
    const row = await auth.db.prepare(`SELECT * FROM posts WHERE slug = ?`).bind(slug).first();
    return json({ post: row });
  }
  const { results } = await auth.db
    .prepare(`SELECT slug, title, category, status, updated_at, level FROM posts ORDER BY updated_at DESC`)
    .all();
  return json({ posts: results || [] });
};

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const auth = await requireAdmin(locals, request);
  if ('error' in auth) return auth.error;
  if (!canPublish(auth.user.role) && auth.user.role !== 'researcher') {
    return json({ error: 'Forbidden' }, 403);
  }
  const body = (await request.json()) as Post & { publish?: boolean };
  const theme = await getThemeSettings(auth.db).catch(() => DEFAULT_THEME);
  if (body.publish || body.status === 'published') {
    if (!canPublish(auth.user.role)) return json({ error: 'Researchers cannot publish' }, 403);
    const errors = validatePublish(body, theme.allowlistDomains);
    if (errors.length) return json({ error: errors.join(' ') }, 400);
    body.status = 'published';
    body.published_at = body.published_at || new Date().toISOString();
  } else {
    body.status = body.status || 'draft';
  }
  body.created_by = body.created_by || auth.user.email;
  body.updated_at = new Date().toISOString();
  await upsertPost(auth.db, body);
  return json({ success: true, slug: body.slug });
};

export const DELETE: import('astro').APIRoute = async ({ locals, request, url }) => {
  const auth = await requireAdmin(locals, request);
  if ('error' in auth) return auth.error;
  if (auth.user.role !== 'owner' && auth.user.role !== 'editor') return json({ error: 'Forbidden' }, 403);
  const slug = url.searchParams.get('slug');
  if (!slug) return json({ error: 'slug required' }, 400);
  await auth.db.prepare(`DELETE FROM posts WHERE slug = ?`).bind(slug).run();
  return json({ success: true });
};
