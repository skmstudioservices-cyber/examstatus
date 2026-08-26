import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const body = await request.json();
    if (!body?.message || typeof body.message !== 'string' || body.message.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Please write a message before submitting.' }), { status: 400 });
    }
    if (db) {
      await db.prepare(
        "INSERT INTO feedback (message, type, contact, pathname) VALUES (?, ?, ?, ?)"
      ).bind(
        body.message.trim().slice(0, 2000),
        body.type === 'feature' ? 'feature' : 'feedback',
        (body.contact || '').trim().slice(0, 200),
        (body.pathname || '').trim().slice(0, 300)
      ).run();
    }
    return new Response(JSON.stringify({ success: true, message: 'Thanks! Your message has been received.' }), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
