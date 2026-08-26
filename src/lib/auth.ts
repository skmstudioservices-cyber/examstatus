import type { AdminRole } from './types';

export interface AdminUser {
  email: string;
  role: AdminRole;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, pepper: string) {
  return sha256(`${pepper}:${password}`);
}

export async function getUserByEmail(db: D1Database, email: string) {
  return db.prepare(`SELECT email, role, password_hash FROM admin_users WHERE email = ?`).bind(email.toLowerCase()).first();
}

export async function upsertAdminUser(
  db: D1Database,
  email: string,
  role: AdminRole,
  passwordHash?: string | null
) {
  await db
    .prepare(
      `INSERT INTO admin_users (email, role, password_hash) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET role = excluded.role,
         password_hash = COALESCE(excluded.password_hash, admin_users.password_hash)`
    )
    .bind(email.toLowerCase(), role, passwordHash ?? null)
    .run();
}

export async function listAdminUsers(db: D1Database) {
  const { results } = await db.prepare(`SELECT email, role, created_at FROM admin_users ORDER BY email`).all();
  return results || [];
}

export async function createSession(db: D1Database, email: string, days = 14) {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  await db.prepare(`INSERT INTO admin_sessions (token, email, expires_at) VALUES (?, ?, ?)`).bind(token, email.toLowerCase(), expires).run();
  return { token, expires };
}

export async function destroySession(db: D1Database, token: string) {
  await db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).bind(token).run();
}

export async function resolveSession(db: D1Database, token: string | undefined | null): Promise<AdminUser | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT s.email, u.role FROM admin_sessions s
       JOIN admin_users u ON u.email = s.email
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .bind(token, new Date().toISOString())
    .first();
  if (!row) return null;
  return { email: String(row.email), role: String(row.role) as AdminRole };
}

/** Cloudflare Access sets this header when Zero Trust protects /admin */
export function accessEmailFromRequest(request: Request): string | null {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  return email ? email.toLowerCase() : null;
}

export async function resolveAdmin(
  db: D1Database,
  request: Request,
  sessionToken: string | undefined
): Promise<AdminUser | null> {
  const accessEmail = accessEmailFromRequest(request);
  if (accessEmail) {
    const user = await getUserByEmail(db, accessEmail);
    if (user) return { email: accessEmail, role: String(user.role) as AdminRole };
    // First Access user becomes owner if no users exist
    const count = await db.prepare(`SELECT COUNT(*) as c FROM admin_users`).first();
    if (Number(count?.c || 0) === 0) {
      await upsertAdminUser(db, accessEmail, 'owner');
      return { email: accessEmail, role: 'owner' };
    }
    return null;
  }
  return resolveSession(db, sessionToken);
}

export async function verifyPasswordLogin(
  db: D1Database,
  email: string,
  password: string,
  pepper: string
): Promise<AdminUser | null> {
  const user = await getUserByEmail(db, email);
  if (!user?.password_hash) return null;
  const hash = await hashPassword(password, pepper);
  if (!timingSafeEqual(String(user.password_hash), hash)) return null;
  return { email: email.toLowerCase(), role: String(user.role) as AdminRole };
}

export function canPublish(role: AdminRole) {
  return role === 'owner' || role === 'editor';
}

export function canManageTheme(role: AdminRole) {
  return role === 'owner';
}

export function canManageUsers(role: AdminRole) {
  return role === 'owner';
}

export function canManageAi(role: AdminRole) {
  return role === 'owner' || role === 'researcher' || role === 'editor';
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}
