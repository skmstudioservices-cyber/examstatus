import { enrichSeedPost } from './seed';
import { upsertPost, validatePublish } from './posts';
import { getThemeSettings } from './settings';
import type { Post, ThemeSettings } from './types';

function hostAllowed(urlStr: string, allowlist: string[]) {
  try {
    const host = new URL(urlStr).hostname.replace(/^www\./, '');
    return allowlist.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function extractWithAi(ai: any, pageText: string, sourceUrl: string) {
  const prompt = `Extract a government exam/job notice into JSON for ExamStatus CMS.
Rules:
- Paraphrase summaries in original wording (never copy Sarkari aggregator sites).
- Only use facts present in the source text.
- official_url must be ${sourceUrl} or same host.
- Include summary (2-4 sentences), how_to_apply (newline steps, >=3), selection_process, documents, faq (>=3 objects with question/answer).
- category one of: latest-jobs, admit-cards, results, answer-keys, syllabus, admissions, scholarships
- level: national or state; states: array of slugs like uttar-pradesh if state-level
Return ONLY JSON with keys: slug,title,category,level,organization,post_name,total_vacancies,start_date,closing_date,exam_date,admit_card_date,result_date,min_age,max_age,official_url,apply_online_url,notification_pdf_url,summary,how_to_apply,selection_process,documents,fees,eligibility,qualifications,job_categories,states,faq,confidence

SOURCE URL: ${sourceUrl}
SOURCE TEXT:
${pageText.slice(0, 12000)}`;

  const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: [
      { role: 'system', content: 'Output only JSON. No markdown fences.' },
      { role: 'user', content: prompt }
    ]
  });
  const text = typeof result === 'string' ? result : result?.response || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON from model');
  const parsed = JSON.parse(match[0]);
  return { post: parsed as Partial<Post>, confidence: Number(parsed.confidence || 0.6), raw: match[0] };
}

function heuristicFromHtml(html: string, sourceUrl: string): Post {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = (titleMatch?.[1] || 'Official notice').replace(/\s+/g, ' ').trim().slice(0, 120);
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || `notice-${Date.now()}`;
  const base = enrichSeedPost({
    slug,
    title,
    category: 'latest-jobs',
    organization: new URL(sourceUrl).hostname,
    postName: title,
    totalVacancies: 0,
    startDate: new Date().toISOString().slice(0, 10),
    closingDate: '',
    examDate: 'As per notification',
    admitCardDate: 'Before exam',
    resultDate: 'To be declared',
    fees: [],
    eligibility: [],
    qualifications: [],
    jobCategories: ['Central Govt'],
    minAge: 'As per rules',
    maxAge: 'As per rules',
    officialUrl: sourceUrl,
    applyOnlineUrl: sourceUrl,
    notificationPdfUrl: sourceUrl
  });
  base.summary = `${title} listed from the official source ${sourceUrl}. Review the notification on the authority website for vacancies, fees, and closing dates before applying.`;
  base.status = 'draft';
  return base;
}

export function mergeExtracted(extracted: Partial<Post>, sourceUrl: string, createdBy: string): Post {
  return {
    ...enrichSeedPost({
      slug: extracted.slug || `draft-${Date.now()}`,
      title: extracted.title || 'Untitled notice',
      category: extracted.category || 'latest-jobs',
      organization: extracted.organization,
      postName: extracted.post_name,
      totalVacancies: extracted.total_vacancies || 0,
      startDate: extracted.start_date,
      closingDate: extracted.closing_date,
      examDate: extracted.exam_date,
      admitCardDate: extracted.admit_card_date,
      resultDate: extracted.result_date,
      fees: extracted.fees || [],
      eligibility: extracted.eligibility || [],
      qualifications: extracted.qualifications || [],
      jobCategories: extracted.job_categories || [],
      minAge: extracted.min_age,
      maxAge: extracted.max_age,
      officialUrl: extracted.official_url || sourceUrl,
      applyOnlineUrl: extracted.apply_online_url || sourceUrl,
      notificationPdfUrl: extracted.notification_pdf_url || sourceUrl
    }),
    ...extracted,
    fees: extracted.fees || [],
    eligibility: extracted.eligibility || [],
    qualifications: extracted.qualifications || [],
    job_categories: extracted.job_categories || [],
    states: extracted.states || [],
    faq: extracted.faq || [],
    body_blocks: extracted.body_blocks || [],
    source_url: sourceUrl,
    created_by: createdBy
  } as Post;
}

export async function runResearchFetch(
  db: D1Database,
  ai: any | undefined,
  theme: ThemeSettings,
  urls: string[],
  createdBy: string
) {
  const created: number[] = [];
  for (const url of urls) {
    if (!url || !hostAllowed(url, theme.allowlistDomains)) {
      await db
        .prepare(`INSERT INTO ai_run_logs (source_url, outcome, detail) VALUES (?, 'reject', 'host not allowlisted')`)
        .bind(url || '')
        .run();
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ExamStatusBot/1.0 (+research; official-sources-only)' }
      });
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');

      let extracted: Partial<Post>;
      let confidence = 0.5;
      let modelId = 'heuristic';
      let rawJson = '';
      if (ai) {
        const out = await extractWithAi(ai, text, url);
        extracted = out.post;
        confidence = out.confidence;
        modelId = '@cf/meta/llama-3.1-8b-instruct-fast';
        rawJson = out.raw;
      } else {
        extracted = heuristicFromHtml(html, url);
        rawJson = JSON.stringify(extracted);
        modelId = 'heuristic-no-ai';
      }

      const insert = await db
        .prepare(
          `INSERT INTO ai_drafts (raw_source_url, extracted_json, model_id, confidence, status) VALUES (?, ?, ?, ?, 'pending')`
        )
        .bind(url, rawJson, modelId, confidence)
        .run();
      const draftId = Number(insert.meta?.last_row_id || 0);
      created.push(draftId);

      if (theme.aiMode === 'auto' && confidence >= 0.75 && extracted.slug) {
        const post = mergeExtracted(extracted, url, 'ai-auto');
        post.status = 'published';
        post.published_at = new Date().toISOString();
        const errors = validatePublish(post, theme.allowlistDomains);
        if (!errors.length) {
          await upsertPost(db, post);
          await db
            .prepare(`UPDATE ai_drafts SET status = 'auto_published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(draftId)
            .run();
        }
      }

      await db.prepare(`INSERT INTO ai_run_logs (source_url, outcome, detail) VALUES (?, 'ok', ?)`).bind(url, modelId).run();
    } catch (e: any) {
      await db
        .prepare(`INSERT INTO ai_run_logs (source_url, outcome, detail) VALUES (?, 'error', ?)`)
        .bind(url, e.message || 'error')
        .run();
    }
  }
  return created;
}

export { hostAllowed, mergeExtracted as mergeExtractedPost };
