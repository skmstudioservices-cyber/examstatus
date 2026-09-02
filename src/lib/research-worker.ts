import { discoverFromSource } from './discovery';
import { getResearchCrawlState, markResearchComplete, shouldRunResearch } from './crawl-state';
import { hostAllowed, runResearchFetch } from './research';
import { rotateSource } from './sources';
import { getPostBySlug, getPostBySourceUrl, upsertPost } from './posts';
import { getThemeSettings } from './settings';
import type { Post, ThemeSettings } from './types';

export interface ResearchWorkerResult {
  skipped: boolean;
  reason: string;
  discovered: number;
  queued: number;
  updated: number;
  draftIds: number[];
  sourceId: string;
  nextRunAt: string | null;
}

async function isUrlRecentlyHandled(db: D1Database, url: string, hours = 24): Promise<boolean> {
  const row = await db
    .prepare(`SELECT last_fetched_at FROM source_crawl_log WHERE url = ?`)
    .bind(url)
    .first();
  if (!row?.last_fetched_at) return false;
  const last = Date.parse(String(row.last_fetched_at));
  if (Number.isNaN(last)) return false;
  return Date.now() - last < hours * 60 * 60 * 1000;
}

async function hasPendingDraft(db: D1Database, url: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT id FROM ai_drafts WHERE raw_source_url = ? AND status = 'pending' LIMIT 1`)
    .bind(url)
    .first();
  return !!row;
}

async function recordCrawl(db: D1Database, url: string, outcome: string) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO source_crawl_log (url, discovered_at, last_fetched_at, outcome)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET last_fetched_at = excluded.last_fetched_at, outcome = excluded.outcome`
    )
    .bind(url, now, now, outcome)
    .run();
}

function mergePostFields(existing: Post, extracted: Partial<Post>): Post {
  const merged = { ...existing };
  const fields: (keyof Post)[] = [
    'title',
    'category',
    'closing_date',
    'start_date',
    'exam_date',
    'admit_card_date',
    'result_date',
    'total_vacancies',
    'organization',
    'post_name',
    'summary',
    'how_to_apply',
    'selection_process',
    'documents',
    'apply_online_url',
    'notification_pdf_url',
    'result_url',
    'official_url'
  ];
  for (const key of fields) {
    const val = extracted[key];
    if (val != null && val !== '' && val !== 0) {
      (merged as Record<string, unknown>)[key] = val;
    }
  }
  if (extracted.fees?.length) merged.fees = extracted.fees;
  if (extracted.eligibility?.length) merged.eligibility = extracted.eligibility;
  if (extracted.faq?.length) merged.faq = extracted.faq;
  merged.last_verified_at = new Date().toISOString().slice(0, 10);
  merged.updated_at = new Date().toISOString();
  return merged;
}

async function tryUpdateExistingPost(
  db: D1Database,
  ai: unknown,
  theme: ThemeSettings,
  url: string,
  extracted: Partial<Post>
): Promise<boolean> {
  let existing = await getPostBySourceUrl(db, url);
  if (!existing && extracted.slug) {
    existing = await getPostBySlug(db, extracted.slug);
  }
  if (!existing || existing.status !== 'published') return false;

  const updated = mergePostFields(existing, extracted);
  updated.source_url = url;
  await upsertPost(db, updated);
  await recordCrawl(db, url, 'updated');
  await db
    .prepare(`INSERT INTO ai_run_logs (source_url, outcome, detail) VALUES (?, 'updated', ?)`)
    .bind(url, existing.slug)
    .run();
  return true;
}

/** Main orchestrator: discover official notices, queue drafts, update existing posts. */
export async function runResearchWorker(
  db: D1Database,
  ai: unknown | undefined,
  opts?: { force?: boolean; createdBy?: string }
): Promise<ResearchWorkerResult> {
  const force = opts?.force ?? false;
  const createdBy = opts?.createdBy ?? 'research-worker';
  const gate = await shouldRunResearch(db, force);
  const state = await getResearchCrawlState(db);

  if (!gate.run) {
    return {
      skipped: true,
      reason: gate.reason,
      discovered: 0,
      queued: 0,
      updated: 0,
      draftIds: [],
      sourceId: '',
      nextRunAt: state.nextRunAt
    };
  }

  const theme = await getThemeSettings(db);
  const { source, nextIndex } = rotateSource(state.cursorIndex);
  const discovered = await discoverFromSource(source, theme.allowlistDomains, 30);

  const newUrls: string[] = [];
  let updated = 0;

  for (const url of discovered) {
    if (!hostAllowed(url, theme.allowlistDomains)) continue;
    if (await isUrlRecentlyHandled(db, url)) continue;
    if (await hasPendingDraft(db, url)) continue;

    const existing = await getPostBySourceUrl(db, url);
    if (existing) {
      const draftIds = await runResearchFetch(db, ai, theme, [url], createdBy);
      if (draftIds.length) {
        const draft = await db.prepare(`SELECT extracted_json FROM ai_drafts WHERE id = ?`).bind(draftIds[0]).first();
        if (draft?.extracted_json) {
          try {
            const extracted = JSON.parse(String(draft.extracted_json)) as Partial<Post>;
            const didUpdate = await tryUpdateExistingPost(db, ai, theme, url, extracted);
            if (didUpdate) updated++;
            await db.prepare(`UPDATE ai_drafts SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(draftIds[0]).run();
          } catch {
            await recordCrawl(db, url, 'update_failed');
          }
        }
      }
      continue;
    }

    newUrls.push(url);
  }

  const batch = newUrls.slice(0, 8);
  const draftIds = batch.length ? await runResearchFetch(db, ai, theme, batch, createdBy) : [];
  for (const url of batch) {
    await recordCrawl(db, url, 'queued');
  }

  const stats = {
    sourceId: source.id,
    discovered: discovered.length,
    queued: draftIds.length,
    updated,
    at: new Date().toISOString()
  };
  await markResearchComplete(db, nextIndex, stats);

  const after = await getResearchCrawlState(db);

  return {
    skipped: false,
    reason: gate.reason,
    discovered: discovered.length,
    queued: draftIds.length,
    updated,
    draftIds,
    sourceId: source.id,
    nextRunAt: after.nextRunAt
  };
}

export { getResearchCrawlState, shouldRunResearch };
