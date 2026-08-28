import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  const db = locals.runtime?.env?.DB;
  if (!db) {
    return new Response('DB unavailable', { status: 503 });
  }

  const row = await db.prepare(
    `SELECT s.token FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ?`
  ).bind(token, new Date().toISOString()).first();

  if (!row) {
    return new Response('Invalid or expired token', { status: 401 });
  }

  const secure = url.protocol === 'https:' ? ' Secure;' : '';
  const cookie = `examstatus_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=31536000`;

  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': cookie,
      'Location': '/admin'
    }
  });
};
