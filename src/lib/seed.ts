import type { Post } from './types';

/** Enrich seed exams with anti-thin content sections */
export function enrichSeedPost(raw: Record<string, unknown>): Post {
  const title = String(raw.title);
  const org = String(raw.organization || '');
  const category = String(raw.category);
  const quals = (raw.qualifications as string[]) || [];
  const fees = (raw.fees as { category: string; amount: string }[]) || [];
  const closing = String(raw.closingDate || '');
  const start = String(raw.startDate || '');

  const summary = `${title} from ${org}. This page summarises vacancies, key dates, fees, and eligibility so aspirants can verify details quickly and open the official portal before applying. Always confirm final instructions on the recruiting authority website.`;

  const howTo = [
    'Visit the official recruiting authority website using the link below.',
    'Complete One-Time Registration / login with a valid email and mobile number.',
    'Fill the online application carefully and upload photo, signature, and certificates as required.',
    'Pay the application fee online if applicable for your category.',
    'Submit the form and download/print the confirmation page for future reference.'
  ].join('\n');

  const selection = [
    'Check the official notification for the exact selection stages.',
    'Typical stages may include computer-based test / written exam, skill test or interview where applicable, and document verification.',
    'Final merit is prepared as per the authority rules after all stages are completed.'
  ].join('\n');

  const documents = [
    'Recent passport-size photograph and signature (as per size guidelines)',
    'Valid photo ID proof',
    'Educational certificates and mark sheets',
    'Category / EWS / PwBD certificate if claiming reservation',
    'Other documents listed in the official notification'
  ].join('\n');

  const faq = [
    {
      question: `What is the last date for ${title}?`,
      answer: closing
        ? `The listed closing date on this tracker is ${closing}. Confirm on the official site before paying any fee.`
        : 'Check the official notification for the closing date.'
    },
    {
      question: 'Where should I apply?',
      answer: `Use only the official apply link for ${org}. Do not share OTP or fees on unofficial sites.`
    },
    {
      question: 'What are the application fees?',
      answer:
        fees.length > 0
          ? fees.map((f) => `${f.category}: ${f.amount}`).join('; ')
          : 'Refer to the official fee table in the notification PDF.'
    }
  ];

  const level = 'national';
  const states: string[] = [];

  return {
    slug: String(raw.slug),
    title,
    category,
    status: 'published',
    level,
    organization: org,
    post_name: String(raw.postName || ''),
    total_vacancies: Number(raw.totalVacancies || 0),
    start_date: start,
    closing_date: closing,
    exam_date: String(raw.examDate || ''),
    admit_card_date: String(raw.admitCardDate || ''),
    result_date: String(raw.resultDate || ''),
    min_age: String(raw.minAge || ''),
    max_age: String(raw.maxAge || ''),
    official_url: String(raw.officialUrl || ''),
    apply_online_url: String(raw.applyOnlineUrl || ''),
    notification_pdf_url: String(raw.notificationPdfUrl || ''),
    summary,
    how_to_apply: howTo,
    selection_process: selection,
    documents,
    fees,
    eligibility: (raw.eligibility as Post['eligibility']) || [],
    qualifications: quals,
    job_categories: (raw.jobCategories as string[]) || [],
    states,
    faq,
    body_blocks: [
      {
        type: 'paragraph',
        text: `Bookmark this ExamStatus page for updates on ${title}. Related filters: ${quals.join(', ') || 'All qualifications'}.`
      }
    ],
    seo_title: title,
    seo_description: summary.slice(0, 155),
    source_url: String(raw.officialUrl || ''),
    last_verified_at: new Date().toISOString().slice(0, 10),
    published_at: new Date().toISOString(),
    created_by: 'seed'
  };
}
