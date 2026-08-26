import { parseCookies, resolveAdmin, canPublish } from '../../../lib/auth';
import { getDb } from '../../../lib/posts';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: import('astro').APIRoute = async ({ locals, request }) => {
  const db = getDb(locals);
  if (!db) return json({ error: 'DB unavailable' }, 503);
  const cookies = parseCookies(request.headers.get('cookie'));
  const user = await resolveAdmin(db, request, cookies['examstatus_session']);
  if (!user || !canPublish(user.role)) return json({ error: 'Forbidden' }, 403);

  const body = await request.json();
  const ai = locals.runtime?.env?.AI;
  if (!ai) {
    // Deterministic fallback when Workers AI not bound (local)
    return json({
      title_hi: body.title ? `【HI】${body.title}` : '',
      summary_hi: body.summary ? `यह सारांश समीक्षा के लिए है: ${String(body.summary).slice(0, 280)}` : '',
      note: 'Workers AI binding missing — placeholder Hindi generated. Bind AI in wrangler for real translation.'
    });
  }

  const prompt = `Translate the following English government-exam portal fields into clear Hindi.
Return ONLY valid JSON with keys title_hi, summary_hi, how_to_apply_hi, selection_process_hi, documents_hi.
Do not invent vacancies or dates. Paraphrase naturally; do not copy competitor websites.

INPUT:
${JSON.stringify(body)}`;

  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'system', content: 'You output only JSON. No markdown.' },
        { role: 'user', content: prompt }
      ]
    });
    const text = typeof result === 'string' ? result : result?.response || JSON.stringify(result);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Model returned no JSON', raw: text }, 500);
    return json(JSON.parse(match[0]));
  } catch (e: any) {
    return json({ error: e.message || 'AI error' }, 500);
  }
};
