import { getDb } from '../../../lib/posts';
import { runResearchWorker } from '../../../lib/research-worker';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const expected = locals.runtime?.env?.AI_CRON_SECRET;
  const got = request.headers.get('x-cron-secret');
  const isInternal = request.headers.get('x-internal-cron') === '1';
  if (!isInternal && (!expected || !got || got !== expected)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const db = getDb(locals);
  if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });
  const ai = locals.runtime?.env?.AI;
  const force = request.headers.get('x-force-research') === '1';
  const result = await runResearchWorker(db, ai, { force, createdBy: 'cron' });
  return new Response(JSON.stringify({ success: true, ...result }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
