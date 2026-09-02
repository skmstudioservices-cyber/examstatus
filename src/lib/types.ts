export type PostCategory =
  | 'latest-jobs'
  | 'admit-cards'
  | 'results'
  | 'answer-keys'
  | 'syllabus'
  | 'admissions'
  | 'scholarships';

export type PostLevel = 'national' | 'state';
export type PostStatus = 'draft' | 'published' | 'archived';
export type AdminRole = 'owner' | 'editor' | 'researcher';
export type AiMode = 'approve' | 'auto';

export type FeeRow = { category: string; amount: string };
export type EligibilityRow = { postName: string; totalPosts: string; qualification: string };
export type FaqItem = { question: string; answer: string };

export type ContentBlock =
  | { type: 'heading'; text: string; level?: 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'cta'; label: string; href: string }
  | { type: 'faq'; items: FaqItem[] };

export interface Post {
  id?: number;
  slug: string;
  title: string;
  title_hi?: string | null;
  category: PostCategory | string;
  status: PostStatus | string;
  level: PostLevel | string;
  organization: string;
  post_name: string;
  total_vacancies: number;
  start_date?: string | null;
  closing_date?: string | null;
  exam_date?: string | null;
  admit_card_date?: string | null;
  result_date?: string | null;
  min_age?: string | null;
  max_age?: string | null;
  official_url?: string | null;
  apply_online_url?: string | null;
  notification_pdf_url?: string | null;
  result_url?: string | null;
  summary?: string | null;
  summary_hi?: string | null;
  how_to_apply?: string | null;
  how_to_apply_hi?: string | null;
  selection_process?: string | null;
  selection_process_hi?: string | null;
  documents?: string | null;
  documents_hi?: string | null;
  fees: FeeRow[];
  eligibility: EligibilityRow[];
  qualifications: string[];
  job_categories: string[];
  states: string[];
  faq: FaqItem[];
  body_blocks: ContentBlock[];
  seo_title?: string | null;
  seo_description?: string | null;
  source_url?: string | null;
  last_verified_at?: string | null;
  published_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ThemeSettings {
  colorPrimary: string;
  colorAccent: string;
  colorBanner: string;
  fontFamily: string;
  bannerText: string;
  bannerTextHi: string;
  logoText: string;
  footerDisclaimer: string;
  footerDisclaimerHi: string;
  columnLatestJobs: string;
  columnAdmitCards: string;
  columnResults: string;
  navItems: { label: string; href: string }[];
  telegramUrl: string;
  whatsappUrl: string;
  aiMode: AiMode;
  allowlistDomains: string[];
  cacheTtlSeconds: number;
  defaultLang: 'en' | 'hi';
}

export const DEFAULT_THEME: ThemeSettings = {
  colorPrimary: '#0f172a',
  colorAccent: '#f59e0b',
  colorBanner: '#b91c1c',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  bannerText: 'LIVE: Track SSC, UPSC, Railway, Banking & State PSC updates',
  bannerTextHi: 'लाइव: SSC, UPSC, रेलवे, बैंकिंग और राज्य PSC अपडेट',
  logoText: 'STATUS',
  footerDisclaimer:
    'Disclaimer: Information here is for immediate awareness and is not a legal document. Always verify on the official recruiting authority website.',
  footerDisclaimerHi:
    'अस्वीकरण: यहाँ दी गई जानकारी केवल सूचना के लिए है। अंतिम विवरण के लिए आधिकारिक वेबसाइट देखें।',
  columnLatestJobs: 'Latest Jobs',
  columnAdmitCards: 'Admit Cards',
  columnResults: 'Results & Keys',
  navItems: [
    { label: 'Boards', href: '/board' },
    { label: 'Home', href: '/' },
    { label: 'National', href: '/national' },
    { label: 'States', href: '/state' },
    { label: 'Latest Jobs', href: '/category/latest-jobs' },
    { label: 'Admit Cards', href: '/category/admit-cards' },
    { label: 'Results', href: '/category/results' }
  ],
  telegramUrl: 'https://telegram.org',
  whatsappUrl: '',
  aiMode: 'approve',
  allowlistDomains: [
    'ssc.gov.in',
    'upsc.gov.in',
    'rrbcdg.gov.in',
    'indianrailways.gov.in',
    'ibps.in',
    'nta.ac.in',
    'ncs.gov.in',
    'gate.iitk.ac.in'
  ],
  cacheTtlSeconds: 300,
  defaultLang: 'en'
};

export const INDIAN_STATES: { slug: string; name: string; nameHi: string }[] = [
  { slug: 'andhra-pradesh', name: 'Andhra Pradesh', nameHi: 'आंध्र प्रदेश' },
  { slug: 'arunachal-pradesh', name: 'Arunachal Pradesh', nameHi: 'अरुणाचल प्रदेश' },
  { slug: 'assam', name: 'Assam', nameHi: 'असम' },
  { slug: 'bihar', name: 'Bihar', nameHi: 'बिहार' },
  { slug: 'chhattisgarh', name: 'Chhattisgarh', nameHi: 'छत्तीसगढ़' },
  { slug: 'delhi', name: 'Delhi', nameHi: 'दिल्ली' },
  { slug: 'goa', name: 'Goa', nameHi: 'गोवा' },
  { slug: 'gujarat', name: 'Gujarat', nameHi: 'गुजरात' },
  { slug: 'haryana', name: 'Haryana', nameHi: 'हरियाणा' },
  { slug: 'himachal-pradesh', name: 'Himachal Pradesh', nameHi: 'हिमाचल प्रदेश' },
  { slug: 'jharkhand', name: 'Jharkhand', nameHi: 'झारखंड' },
  { slug: 'karnataka', name: 'Karnataka', nameHi: 'कर्नाटक' },
  { slug: 'kerala', name: 'Kerala', nameHi: 'केरल' },
  { slug: 'madhya-pradesh', name: 'Madhya Pradesh', nameHi: 'मध्य प्रदेश' },
  { slug: 'maharashtra', name: 'Maharashtra', nameHi: 'महाराष्ट्र' },
  { slug: 'odisha', name: 'Odisha', nameHi: 'ओडिशा' },
  { slug: 'punjab', name: 'Punjab', nameHi: 'पंजाब' },
  { slug: 'rajasthan', name: 'Rajasthan', nameHi: 'राजस्थान' },
  { slug: 'tamil-nadu', name: 'Tamil Nadu', nameHi: 'तमिलनाडु' },
  { slug: 'telangana', name: 'Telangana', nameHi: 'तेलंगाना' },
  { slug: 'uttar-pradesh', name: 'Uttar Pradesh', nameHi: 'उत्तर प्रदेश' },
  { slug: 'uttarakhand', name: 'Uttarakhand', nameHi: 'उत्तराखंड' },
  { slug: 'west-bengal', name: 'West Bengal', nameHi: 'पश्चिम बंगाल' }
];

export interface BoardHub {
  slug: string;
  name: string;
  nameHi: string;
  description: string;
  keywords: string[];
}

export const BOARD_HUBS: BoardHub[] = [
  {
    slug: 'ssc',
    name: 'Staff Selection Commission (SSC)',
    nameHi: 'कर्मचारी चयन आयोग (SSC)',
    description: 'SSC CGL, CHSL, MTS, GD, Stenographer and other central graduate/10+2 recruitments.',
    keywords: ['ssc', 'staff selection commission']
  },
  {
    slug: 'upsc',
    name: 'Union Public Service Commission (UPSC)',
    nameHi: 'संघ लोक सेवा आयोग (UPSC)',
    description: 'Civil Services, CAPF, NDA, CDS, EPFO and other UPSC examinations.',
    keywords: ['upsc', 'union public service commission']
  },
  {
    slug: 'rrb',
    name: 'Railway Recruitment Board (RRB)',
    nameHi: 'रेलवे भर्ती बोर्ड (RRB)',
    description: 'RRB NTPC, Group D, ALP, JE and other Indian Railways recruitments.',
    keywords: ['rrb', 'railway recruitment', 'indian railways', 'railway']
  },
  {
    slug: 'ibps',
    name: 'Institute of Banking Personnel Selection (IBPS)',
    nameHi: 'बैंकिंग कार्मिक चयन संस्थान (IBPS)',
    description: 'IBPS PO, Clerk, SO, RRB bank recruitments and related banking exams.',
    keywords: ['ibps', 'banking personnel', 'bank']
  },
  {
    slug: 'nta',
    name: 'National Testing Agency (NTA)',
    nameHi: 'राष्ट्रीय परीक्षा एजेंसी (NTA)',
    description: 'JEE, NEET, UGC NET, CUET and other NTA-conducted entrance tests.',
    keywords: ['nta', 'national testing agency']
  }
];

export const CATEGORY_LABELS: Record<string, string> = {
  'latest-jobs': 'Latest Jobs',
  'admit-cards': 'Admit Cards',
  results: 'Results',
  'answer-keys': 'Answer Keys',
  syllabus: 'Syllabus',
  admissions: 'Admissions',
  scholarships: 'Scholarships'
};
