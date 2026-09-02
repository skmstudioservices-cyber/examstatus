/** Randomized research schedule: 3–9 hours between runs. */

export const RESEARCH_MIN_MS = 3 * 60 * 60 * 1000;
export const RESEARCH_MAX_MS = 9 * 60 * 60 * 1000;

export interface ResearchCrawlState {
  nextRunAt: string | null;
  lastRunAt: string | null;
  cursorIndex: number;
  lastStats: string | null;
}

const KEYS = {
  nextRun: 'research_next_run_at',
  lastRun: 'research_last_run_at',
  cursor: 'research_cursor_index',
  stats: 'research_last_stats'
} as const;

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare(`SELECT value FROM site_settings WHERE key = ?`).bind(key).first();
  return row?.value != null ? String(row.value) : null;
}

async function setSetting(db: D1Database, key: string, value: string) {
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(key, value)
    .run();
}

export function randomDelayMs(): number {
  return RESEARCH_MIN_MS + Math.floor(Math.random() * (RESEARCH_MAX_MS - RESEARCH_MIN_MS + 1));
}

export async function getResearchCrawlState(db: D1Database): Promise<ResearchCrawlState> {
  const [nextRunAt, lastRunAt, cursorRaw, lastStats] = await Promise.all([
    getSetting(db, KEYS.nextRun),
    getSetting(db, KEYS.lastRun),
    getSetting(db, KEYS.cursor),
    getSetting(db, KEYS.stats)
  ]);
  const cursorIndex = cursorRaw != null ? Number(cursorRaw) || 0 : 0;
  return { nextRunAt, lastRunAt, cursorIndex, lastStats };
}

export async function shouldRunResearch(db: D1Database, force = false): Promise<{ run: boolean; reason: string }> {
  if (force) return { run: true, reason: 'forced' };
  const { nextRunAt } = await getResearchCrawlState(db);
  if (!nextRunAt) return { run: true, reason: 'no_schedule' };
  const next = Date.parse(nextRunAt);
  if (Number.isNaN(next)) return { run: true, reason: 'invalid_schedule' };
  if (Date.now() >= next) return { run: true, reason: 'due' };
  return { run: false, reason: `next_run_at_${nextRunAt}` };
}

export async function markResearchComplete(
  db: D1Database,
  cursorIndex: number,
  stats: Record<string, unknown>
) {
  const now = new Date();
  const next = new Date(now.getTime() + randomDelayMs());
  await Promise.all([
    setSetting(db, KEYS.lastRun, now.toISOString()),
    setSetting(db, KEYS.nextRun, next.toISOString()),
    setSetting(db, KEYS.cursor, String(cursorIndex)),
    setSetting(db, KEYS.stats, JSON.stringify(stats))
  ]);
}
