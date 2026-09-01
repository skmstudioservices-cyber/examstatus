import type { APIRoute } from 'astro';
import { parseCookies, resolveAdmin } from '../../../lib/auth';
import { runFullAudit } from '../../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  const ai = locals.runtime?.env?.AI;
  if (!db || !ai) return new Response(JSON.stringify({ error: 'DB or AI unavailable' }), { status: 503 });

  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const baseUrl = 'https://examstatus.skmstudio-services.workers.dev';
  const recent = await db
    .prepare(`SELECT slug FROM posts WHERE status = 'published' ORDER BY id DESC LIMIT 3`)
    .all();
  const examPaths = (recent.results || []).map((r: any) => `/exam/${r.slug}`);
  const paths = ['/', ...examPaths];

  const results = await runFullAudit(ai, db, baseUrl, paths);
  const totalFindings = results.reduce((sum, r) => sum + (r.count || 0), 0);

  return new Response(JSON.stringify({ success: true, pagesChecked: paths.length, totalFindings, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
