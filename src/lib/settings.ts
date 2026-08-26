import { DEFAULT_THEME, type ThemeSettings } from './types';

export async function getThemeSettings(db: D1Database): Promise<ThemeSettings> {
  let row: { value?: unknown } | null;
  try {
    row = await db.prepare(`SELECT value FROM site_settings WHERE key = 'theme'`).first();
  } catch {
    return { ...DEFAULT_THEME };
  }
  if (!row?.value) return { ...DEFAULT_THEME };
  try {
    return { ...DEFAULT_THEME, ...(JSON.parse(String(row.value)) as Partial<ThemeSettings>) };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export async function saveThemeSettings(db: D1Database, theme: ThemeSettings) {
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('theme', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(JSON.stringify(theme))
    .run();
}

export function cacheHeaders(ttlSeconds: number, isDetail = false): HeadersInit {
  const ttl = isDetail ? Math.min(ttlSeconds, 120) : ttlSeconds;
  return {
    'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
  };
}
