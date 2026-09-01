// src/lib/audit.ts
// Self-review system: fetches the site's own pages and uses Workers AI to find
// technical/SEO/accessibility/responsive/content-quality issues.
// Findings are stored for human review in /admin/audit — nothing here changes the live site.

export interface AuditFinding {
  category: 'seo' | 'accessibility' | 'responsive' | 'content-quality' | 'broken-link' | 'other';
  severity: 'low' | 'medium' | 'high';
  finding: string;
  suggestion: string;
}

const AUDIT_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/qwen/qwen1.5-14b-chat-awq',
] as const;

const SYSTEM_PROMPT = `You are a strict technical auditor reviewing raw HTML from a live website.
Check for these categories only:
- seo: missing/duplicate title or meta description, missing canonical tag, missing structured data
- accessibility: images without alt text, poor heading hierarchy (skipped levels), low-contrast inline colors
- responsive: fixed pixel widths that would break on mobile, missing viewport meta tag, elements likely to overflow on a 375px-wide screen
- content-quality: very short body text, generic/duplicate-looking link text (e.g. "click here" repeated), placeholder text left in
- broken-link: href="#" or empty href on non-decorative links, links pointing to obviously wrong domains

Respond with ONLY a JSON array, no prose, no markdown fences. Each item:
{"category":"seo|accessibility|responsive|content-quality|broken-link|other","severity":"low|medium|high","finding":"specific description with the exact tag/text involved","suggestion":"concrete one-line fix"}

If you find nothing worth flagging, respond with exactly: []
Do not invent issues that aren't actually present in the HTML. Be specific, not generic.`;

function extractJsonArray(text: string): AuditFinding[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f) => f && f.category && f.finding);
  } catch {
    return [];
  }
}

export async function auditPage(
  ai: any,
  db: any,
  url: string,
  modelIndex = 0
): Promise<{ ok: boolean; count: number; error?: string }> {
  let html: string;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ExamStatusAuditBot/1.0 (+self-review)' } });
    html = await res.text();
  } catch (e: any) {
    return { ok: false, count: 0, error: `fetch failed: ${e.message}` };
  }

  // Truncate to keep neuron usage predictable — first 6000 chars covers head + above-the-fold body
  const snippet = html.slice(0, 6000);
  const model = AUDIT_MODELS[modelIndex % AUDIT_MODELS.length];
  const path = new URL(url).pathname;

  let output: any;
  try {
    output = await ai.run(model, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Page: ${path}\n\nHTML:\n${snippet}` },
      ],
      max_tokens: 1200,
    });
  } catch (e: any) {
    return { ok: false, count: 0, error: `AI call failed (${model}): ${e.message}` };
  }

  const text = typeof output?.response === 'string' ? output.response : '';
  const findings = extractJsonArray(text);

  if (findings.length === 0) {
    return { ok: true, count: 0 };
  }

  const stmt = db.prepare(
    `INSERT INTO audit_findings (page_path, category, severity, finding, suggestion, model_used) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const batch = findings.map((f) =>
    stmt.bind(path, f.category, f.severity, f.finding, f.suggestion || '', model)
  );
  await db.batch(batch);

  return { ok: true, count: findings.length };
}

export async function runFullAudit(ai: any, db: any, baseUrl: string, paths: string[]) {
  const results: Array<{ path: string; ok: boolean; count: number; error?: string }> = [];
  for (let i = 0; i < paths.length; i++) {
    const url = new URL(paths[i], baseUrl).toString();
    const result = await auditPage(ai, db, url, i);
    results.push({ path: paths[i], ...result });
  }
  return results;
}
