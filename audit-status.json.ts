import type { APIRoute } from 'astro';
import { parseCookies, resolveAdmin } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });

  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  const id = Number(body?.id);
  const status = body?.status === 'dismissed' ? 'dismissed' : 'resolved';
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  await db.prepare(`UPDATE audit_findings SET status = ? WHERE id = ?`).bind(status, id).run();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
