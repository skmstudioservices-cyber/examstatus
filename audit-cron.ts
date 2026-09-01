// src/pages/api/cron/audit.ts
import type { APIRoute } from 'astro';
import { runFullAudit } from '../../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const secret = locals.runtime?.env?.AI_CRON_SECRET;
  const got = request.headers.get('x-cron-secret');
  if (!secret || got !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const ai = locals.runtime?.env?.AI;
  const db = locals.runtime?.env?.DB;
  if (!ai || !db) {
    return new Response(JSON.stringify({ error: 'AI or DB binding unavailable' }), { status: 503 });
  }

  const baseUrl = 'https://examstatus.skmstudio-services.workers.dev';

  // Pick a small, rotating sample so daily neuron usage stays predictable.
  // Homepage every run, plus up to 3 recent published exam pages.
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
