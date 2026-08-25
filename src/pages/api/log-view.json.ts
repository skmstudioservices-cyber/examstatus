import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const data = await request.json().catch(() => ({}));
    const pathname = data.pathname || '/';
    const referrer = data.referrer || request.headers.get('referer') || 'Direct';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const country = request.headers.get('cf-ipcountry') || 'IN';

    let deviceType = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
    else if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';

    if (db) {
      await db.prepare(
        "INSERT INTO analytics_logs (pathname, device_type, user_agent, referrer, country) VALUES (?, ?, ?, ?, ?)"
      ).bind(pathname, deviceType, userAgent.substring(0, 250), referrer.substring(0, 250), country).run();
    }
    return new Response(JSON.stringify({ recorded: true }), { status: 200 });
  } catch {
    return new Response(null, { status: 204 });
  }
};
