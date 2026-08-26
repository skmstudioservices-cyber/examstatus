import { createSession, destroySession, hashPassword, parseCookies, resolveAdmin, upsertAdminUser, verifyPasswordLogin, listAdminUsers, canManageUsers } from '../../../lib/auth';
import { getDb } from '../../../lib/posts';

export const prerender = false;

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function adminSecret(locals: App.Locals, url: URL): string | null {
  const secret = locals.runtime?.env?.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return 'dev-only-change-me';
  return null;
}

function sessionCookie(token: string, maxAge: number, url: URL) {
  const secure = url.protocol === 'https:' ? ' Secure;' : '';
  return `examstatus_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAge}`;
}

export const GET: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'DB unavailable' }, 503);
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user) return json({ authenticated: false });
  const users = canManageUsers(user.role) ? await listAdminUsers(db) : [];
  return json({ authenticated: true, user, users });
};

export const POST: import('astro').APIRoute = async ({ locals, request, url }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'DB unavailable' }, 503);
  const body = await request.json();
  const action = body.action as string;
  const pepper = adminSecret(locals, url);

  if (action === 'bootstrap') {
    if (!pepper) return json({ error: 'ADMIN_SESSION_SECRET is required before password bootstrap' }, 503);
    const count = await db.prepare(`SELECT COUNT(*) as c FROM admin_users`).first();
    if (Number(count?.c || 0) > 0) return json({ error: 'Already bootstrapped' }, 400);
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    if (!email || password.length < 10) return json({ error: 'Email and password (10+ chars) required' }, 400);
    const hash = await hashPassword(password, pepper);
    await upsertAdminUser(db, email, 'owner', hash);
    const session = await createSession(db, email);
    return json(
      { success: true, user: { email, role: 'owner' } },
      200,
      {
        'Set-Cookie': sessionCookie(session.token, 14 * 86400, url)
      }
    );
  }

  if (action === 'login') {
    if (!pepper) return json({ error: 'ADMIN_SESSION_SECRET is required before password login' }, 503);
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    const user = await verifyPasswordLogin(db, email, password, pepper);
    if (!user) return json({ error: 'Invalid credentials' }, 401);
    const session = await createSession(db, user.email);
    return json(
      { success: true, user },
      200,
      {
        'Set-Cookie': sessionCookie(session.token, 14 * 86400, url)
      }
    );
  }

  if (action === 'logout') {
    const cookies = parseCookies(request.headers.get('cookie'));
    if (cookies['examstatus_session']) await destroySession(db, cookies['examstatus_session']);
    return json({ success: true }, 200, {
      'Set-Cookie': sessionCookie('', 0, url)
    });
  }

  if (action === 'add_user') {
    const cookies = parseCookies(request.headers.get('cookie'));
    const me = await resolveAdmin(db, request, cookies['examstatus_session']);
    if (!me || !canManageUsers(me.role)) return json({ error: 'Forbidden' }, 403);
    const email = String(body.email || '').toLowerCase().trim();
    const role = body.role === 'owner' || body.role === 'researcher' ? body.role : 'editor';
    let hash: string | null = null;
    if (body.password) {
      if (!pepper) return json({ error: 'ADMIN_SESSION_SECRET is required before password setup' }, 503);
      hash = await hashPassword(String(body.password), pepper);
    }
    await upsertAdminUser(db, email, role, hash);
    return json({ success: true });
  }

  return json({ error: 'Unknown action' }, 400);
};
