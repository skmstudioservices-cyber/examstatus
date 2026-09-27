import fs from 'node:fs';
import path from 'node:path';
import { enrichSeedPost } from '../src/lib/seed.ts';

const exams = JSON.parse(fs.readFileSync('./src/data/exams.json', 'utf8'));

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

let sql = '';
for (const raw of exams) {
  const post = enrichSeedPost(raw);
  
  const values = [
    escapeSql(post.slug),
    escapeSql(post.title),
    escapeSql(post.title_hi || null),
    escapeSql(post.category),
    escapeSql(post.status),
    escapeSql(post.level),
    escapeSql(post.organization),
    escapeSql(post.post_name),
    Number(post.total_vacancies || 0),
    escapeSql(post.start_date || null),
    escapeSql(post.closing_date || null),
    escapeSql(post.exam_date || null),
    escapeSql(post.admit_card_date || null),
    escapeSql(post.result_date || null),
    escapeSql(post.min_age || null),
    escapeSql(post.max_age || null),
    escapeSql(post.official_url || null),
    escapeSql(post.apply_online_url || null),
    escapeSql(post.notification_pdf_url || null),
    escapeSql(post.result_url || null),
    escapeSql(post.summary || null),
    escapeSql(post.summary_hi || null),
    escapeSql(post.how_to_apply || null),
    escapeSql(post.how_to_apply_hi || null),
    escapeSql(post.selection_process || null),
    escapeSql(post.selection_process_hi || null),
    escapeSql(post.documents || null),
    escapeSql(post.documents_hi || null),
    escapeSql(JSON.stringify(post.fees || [])),
    escapeSql(JSON.stringify(post.eligibility || [])),
    escapeSql(JSON.stringify(post.qualifications || [])),
    escapeSql(JSON.stringify(post.job_categories || [])),
    escapeSql(JSON.stringify(post.states || [])),
    escapeSql(JSON.stringify(post.faq || [])),
    escapeSql(JSON.stringify(post.body_blocks || [])),
    escapeSql(post.seo_title || null),
    escapeSql(post.seo_description || null),
    escapeSql(post.source_url || null),
    escapeSql(post.last_verified_at || null),
    escapeSql(post.published_at || new Date().toISOString()),
    escapeSql('seed')
  ];

  sql += `INSERT INTO posts (
    slug, title, title_hi, category, status, level, organization, post_name, total_vacancies,
    start_date, closing_date, exam_date, admit_card_date, result_date, min_age, max_age,
    official_url, apply_online_url, notification_pdf_url, result_url,
    summary, summary_hi, how_to_apply, how_to_apply_hi, selection_process, selection_process_hi,
    documents, documents_hi, fees_json, eligibility_json, qualifications_json, job_categories_json,
    states_json, faq_json, body_blocks_json, seo_title, seo_description, source_url,
    last_verified_at, published_at, created_by, updated_at
  ) VALUES (${values.join(', ')}, CURRENT_TIMESTAMP)
  ON CONFLICT(slug) DO UPDATE SET
    title=excluded.title, category=excluded.category, status='published',
    level=excluded.level, organization=excluded.organization, post_name=excluded.post_name,
    total_vacancies=excluded.total_vacancies, start_date=excluded.start_date, closing_date=excluded.closing_date,
    exam_date=excluded.exam_date, admit_card_date=excluded.admit_card_date, result_date=excluded.result_date,
    min_age=excluded.min_age, max_age=excluded.max_age, official_url=excluded.official_url,
    apply_online_url=excluded.apply_online_url, notification_pdf_url=excluded.notification_pdf_url,
    summary=excluded.summary, how_to_apply=excluded.how_to_apply,
    selection_process=excluded.selection_process, documents=excluded.documents,
    fees_json=excluded.fees_json, eligibility_json=excluded.eligibility_json,
    qualifications_json=excluded.qualifications_json, job_categories_json=excluded.job_categories_json,
    states_json=excluded.states_json, faq_json=excluded.faq_json,
    seo_title=excluded.seo_title, seo_description=excluded.seo_description,
    last_verified_at=excluded.last_verified_at, published_at=excluded.published_at,
    updated_at=CURRENT_TIMESTAMP;\n`;
}

fs.writeFileSync('./scripts/seed-d1.sql', sql);
console.log(`Generated SQL for ${exams.length} exams.`);
