import { canManageTheme, parseCookies, resolveAdmin } from '../../../lib/auth';
import { getDb } from '../../../lib/posts';
import { getThemeSettings, saveThemeSettings } from '../../../lib/settings';
import { DEFAULT_THEME, type ThemeSettings } from '../../../lib/types';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ theme: DEFAULT_THEME });
  const theme = await getThemeSettings(db);
  return json({ theme });
};

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'DB unavailable' }, 503);
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user || !canManageTheme(user.role)) return json({ error: 'Forbidden' }, 403);
  const body = (await request.json()) as ThemeSettings;
  await saveThemeSettings(db, { ...DEFAULT_THEME, ...body });
  return json({ success: true });
};
