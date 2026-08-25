import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const body = await request.json();
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
      return new Response(JSON.stringify({ error: 'Invalid push payload.' }), { status: 400 });
    }
    if (db) {
      await db.prepare(
        "INSERT OR IGNORE INTO push_subscribers (endpoint, p256dh, auth, user_agent, ip_country, category_preference) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(body.endpoint, body.keys.p256dh, body.keys.auth, request.headers.get('user-agent') || '', request.headers.get('cf-ipcountry') || '', 'all').run();
    }
    return new Response(JSON.stringify({ success: true, message: 'Subscribed to real-time exam alerts.' }), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
