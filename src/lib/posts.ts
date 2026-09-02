import type { ContentBlock, FeeRow, EligibilityRow, FaqItem, Post } from './types';

type Row = Record<string, unknown>;

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function rowToPost(row: Row): Post {
  return {
    id: row.id as number,
    slug: String(row.slug),
    title: String(row.title),
    title_hi: (row.title_hi as string) || null,
    category: String(row.category),
    status: String(row.status),
    level: String(row.level || 'national'),
    organization: String(row.organization || ''),
    post_name: String(row.post_name || ''),
    total_vacancies: Number(row.total_vacancies || 0),
    start_date: (row.start_date as string) || null,
    closing_date: (row.closing_date as string) || null,
    exam_date: (row.exam_date as string) || null,
    admit_card_date: (row.admit_card_date as string) || null,
    result_date: (row.result_date as string) || null,
    min_age: (row.min_age as string) || null,
    max_age: (row.max_age as string) || null,
    official_url: (row.official_url as string) || null,
    apply_online_url: (row.apply_online_url as string) || null,
    notification_pdf_url: (row.notification_pdf_url as string) || null,
    result_url: (row.result_url as string) || null,
    summary: (row.summary as string) || null,
    summary_hi: (row.summary_hi as string) || null,
    how_to_apply: (row.how_to_apply as string) || null,
    how_to_apply_hi: (row.how_to_apply_hi as string) || null,
    selection_process: (row.selection_process as string) || null,
    selection_process_hi: (row.selection_process_hi as string) || null,
    documents: (row.documents as string) || null,
    documents_hi: (row.documents_hi as string) || null,
    fees: parseJson<FeeRow[]>(row.fees_json, []),
    eligibility: parseJson<EligibilityRow[]>(row.eligibility_json, []),
    qualifications: parseJson<string[]>(row.qualifications_json, []),
    job_categories: parseJson<string[]>(row.job_categories_json, []),
    states: parseJson<string[]>(row.states_json, []),
    faq: parseJson<FaqItem[]>(row.faq_json, []),
    body_blocks: parseJson<ContentBlock[]>(row.body_blocks_json, []),
    seo_title: (row.seo_title as string) || null,
    seo_description: (row.seo_description as string) || null,
    source_url: (row.source_url as string) || null,
    last_verified_at: (row.last_verified_at as string) || null,
    published_at: (row.published_at as string) || null,
    created_by: (row.created_by as string) || null,
    created_at: (row.created_at as string) || null,
    updated_at: (row.updated_at as string) || null
  };
}

export function getDb(locals: App.Locals): D1Database | null {
  return locals.runtime?.env?.DB ?? null;
}

export async function listPublishedPosts(db: D1Database, opts?: {
  category?: string;
  level?: string;
  state?: string;
  limit?: number;
}): Promise<Post[]> {
  let sql = `SELECT * FROM posts WHERE status = 'published'`;
  const binds: string[] = [];
  if (opts?.category) {
    sql += ` AND category = ?`;
    binds.push(opts.category);
  }
  if (opts?.level) {
    sql += ` AND level = ?`;
    binds.push(opts.level);
  }
  sql += ` ORDER BY COALESCE(published_at, updated_at, created_at) DESC`;
  if (opts?.limit) {
    sql += ` LIMIT ${Number(opts.limit)}`;
  }
  const { results } = await db.prepare(sql).bind(...binds).all();
  let posts = (results || []).map((r) => rowToPost(r as Row));
  if (opts?.state) {
    posts = posts.filter((p) => p.states.includes(opts.state!) || p.level === 'national');
  }
  return posts;
}

export async function getPostBySlug(db: D1Database, slug: string): Promise<Post | null> {
  const row = await db.prepare(`SELECT * FROM posts WHERE slug = ?`).bind(slug).first();
  return row ? rowToPost(row as Row) : null;
}

export async function getPostBySourceUrl(db: D1Database, sourceUrl: string): Promise<Post | null> {
  const row = await db.prepare(`SELECT * FROM posts WHERE source_url = ? LIMIT 1`).bind(sourceUrl).first();
  return row ? rowToPost(row as Row) : null;
}

export async function listPublishedByBoard(db: D1Database, keywords: string[]): Promise<Post[]> {
  const { results } = await db
    .prepare(`SELECT * FROM posts WHERE status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 200`)
    .all();
  const lower = keywords.map((k) => k.toLowerCase());
  return (results || [])
    .map((r) => rowToPost(r as Row))
    .filter((p) => {
      const hay = `${p.organization} ${p.title} ${p.post_name}`.toLowerCase();
      return lower.some((kw) => hay.includes(kw));
    });
}

export async function listAllPosts(db: D1Database): Promise<Post[]> {
  const { results } = await db.prepare(`SELECT * FROM posts ORDER BY updated_at DESC`).all();
  return (results || []).map((r) => rowToPost(r as Row));
}

export async function relatedPosts(db: D1Database, post: Post, limit = 4): Promise<Post[]> {
  const { results } = await db
    .prepare(`SELECT * FROM posts WHERE status = 'published' AND slug != ? ORDER BY published_at DESC LIMIT 40`)
    .bind(post.slug)
    .all();
  const all = (results || []).map((r) => rowToPost(r as Row));
  const scored = all
    .map((p) => {
      let score = 0;
      if (p.category === post.category) score += 3;
      if (p.organization === post.organization) score += 4;
      if (p.level === post.level) score += 1;
      const qOverlap = p.qualifications.filter((q) => post.qualifications.includes(q)).length;
      score += qOverlap * 2;
      const sOverlap = p.states.filter((s) => post.states.includes(s)).length;
      score += sOverlap * 3;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
  return scored.length ? scored : all.slice(0, limit);
}

export function postToBinds(post: Post) {
  return [
    post.slug,
    post.title,
    post.title_hi || null,
    post.category,
    post.status,
    post.level || 'national',
    post.organization || '',
    post.post_name || '',
    post.total_vacancies || 0,
    post.start_date || null,
    post.closing_date || null,
    post.exam_date || null,
    post.admit_card_date || null,
    post.result_date || null,
    post.min_age || null,
    post.max_age || null,
    post.official_url || null,
    post.apply_online_url || null,
    post.notification_pdf_url || null,
    post.result_url || null,
    post.summary || null,
    post.summary_hi || null,
    post.how_to_apply || null,
    post.how_to_apply_hi || null,
    post.selection_process || null,
    post.selection_process_hi || null,
    post.documents || null,
    post.documents_hi || null,
    JSON.stringify(post.fees || []),
    JSON.stringify(post.eligibility || []),
    JSON.stringify(post.qualifications || []),
    JSON.stringify(post.job_categories || []),
    JSON.stringify(post.states || []),
    JSON.stringify(post.faq || []),
    JSON.stringify(post.body_blocks || []),
    post.seo_title || null,
    post.seo_description || null,
    post.source_url || null,
    post.last_verified_at || null,
    post.published_at || null,
    post.created_by || null
  ];
}

const INSERT_SQL = `INSERT INTO posts (
  slug, title, title_hi, category, status, level, organization, post_name, total_vacancies,
  start_date, closing_date, exam_date, admit_card_date, result_date, min_age, max_age,
  official_url, apply_online_url, notification_pdf_url, result_url,
  summary, summary_hi, how_to_apply, how_to_apply_hi, selection_process, selection_process_hi,
  documents, documents_hi, fees_json, eligibility_json, qualifications_json, job_categories_json,
  states_json, faq_json, body_blocks_json, seo_title, seo_description, source_url,
  last_verified_at, published_at, created_by, updated_at
) VALUES (${Array(41).fill('?').join(',')}, CURRENT_TIMESTAMP)
ON CONFLICT(slug) DO UPDATE SET
  title=excluded.title, title_hi=excluded.title_hi, category=excluded.category, status=excluded.status,
  level=excluded.level, organization=excluded.organization, post_name=excluded.post_name,
  total_vacancies=excluded.total_vacancies, start_date=excluded.start_date, closing_date=excluded.closing_date,
  exam_date=excluded.exam_date, admit_card_date=excluded.admit_card_date, result_date=excluded.result_date,
  min_age=excluded.min_age, max_age=excluded.max_age, official_url=excluded.official_url,
  apply_online_url=excluded.apply_online_url, notification_pdf_url=excluded.notification_pdf_url,
  result_url=excluded.result_url, summary=excluded.summary, summary_hi=excluded.summary_hi,
  how_to_apply=excluded.how_to_apply, how_to_apply_hi=excluded.how_to_apply_hi,
  selection_process=excluded.selection_process, selection_process_hi=excluded.selection_process_hi,
  documents=excluded.documents, documents_hi=excluded.documents_hi, fees_json=excluded.fees_json,
  eligibility_json=excluded.eligibility_json, qualifications_json=excluded.qualifications_json,
  job_categories_json=excluded.job_categories_json, states_json=excluded.states_json,
  faq_json=excluded.faq_json, body_blocks_json=excluded.body_blocks_json, seo_title=excluded.seo_title,
  seo_description=excluded.seo_description, source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at, published_at=excluded.published_at,
  created_by=excluded.created_by, updated_at=CURRENT_TIMESTAMP`;

export async function upsertPost(db: D1Database, post: Post) {
  await db.prepare(INSERT_SQL).bind(...postToBinds(post)).run();
}

export async function deletePost(db: D1Database, slug: string) {
  await db.prepare(`DELETE FROM posts WHERE slug = ?`).bind(slug).run();
}

export function validatePublish(post: Post, allowlist: string[]): string[] {
  const errors: string[] = [];
  if (!post.summary || post.summary.trim().length < 40) errors.push('Summary must be at least 40 characters.');
  if (!post.faq || post.faq.length < 3) errors.push('At least 3 FAQs required.');
  if (!post.how_to_apply || post.how_to_apply.split('\n').filter(Boolean).length < 3) {
    errors.push('How to apply needs at least 3 steps (one per line).');
  }
  if (!post.official_url) errors.push('Official URL is required.');
  else {
    try {
      const host = new URL(post.official_url).hostname.replace(/^www\./, '');
      const ok = allowlist.some((d) => host === d || host.endsWith('.' + d));
      if (!ok) errors.push('Official URL host must be on the allowlist.');
    } catch {
      errors.push('Official URL is invalid.');
    }
  }
  return errors;
}
