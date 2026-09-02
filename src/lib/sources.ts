/** Official recruiting board listing pages (allowlisted hosts only). */

export interface OfficialSource {
  id: string;
  name: string;
  domain: string;
  listingUrls: string[];
  organizationKeywords: string[];
}

export const NOTICE_KEYWORDS = [
  'recruitment',
  'recruit',
  'notification',
  'vacancy',
  'vacancies',
  'apply',
  'online',
  'admit',
  'result',
  'answer',
  'syllabus',
  'examination',
  'exam',
  'post',
  'employment',
  'career',
  'notice',
  'advertisement',
  'advert',
  'form',
  'counselling',
  'counseling',
  'score',
  'cutoff',
  'merit',
  'hall ticket',
  'call letter'
];

export const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: 'ssc',
    name: 'Staff Selection Commission (SSC)',
    domain: 'ssc.gov.in',
    listingUrls: ['https://ssc.gov.in/', 'https://ssc.gov.in/home/notice-board'],
    organizationKeywords: ['ssc', 'staff selection commission']
  },
  {
    id: 'upsc',
    name: 'Union Public Service Commission (UPSC)',
    domain: 'upsc.gov.in',
    listingUrls: ['https://upsc.gov.in/', 'https://upsc.gov.in/whats-new'],
    organizationKeywords: ['upsc', 'union public service commission']
  },
  {
    id: 'ibps',
    name: 'Institute of Banking Personnel Selection (IBPS)',
    domain: 'ibps.in',
    listingUrls: ['https://www.ibps.in/', 'https://ibps.in/index.php/career/'],
    organizationKeywords: ['ibps', 'banking personnel']
  },
  {
    id: 'nta',
    name: 'National Testing Agency (NTA)',
    domain: 'nta.ac.in',
    listingUrls: ['https://nta.ac.in/', 'https://nta.ac.in/Examination'],
    organizationKeywords: ['nta', 'national testing agency']
  },
  {
    id: 'rrb',
    name: 'Railway Recruitment Board (RRB)',
    domain: 'rrbcdg.gov.in',
    listingUrls: ['https://rrbcdg.gov.in/', 'https://indianrailways.gov.in/'],
    organizationKeywords: ['rrb', 'railway recruitment', 'indian railways']
  },
  {
    id: 'ncs',
    name: 'National Career Service (NCS)',
    domain: 'ncs.gov.in',
    listingUrls: ['https://www.ncs.gov.in/', 'https://ncs.gov.in/job-seeker/Pages/default.aspx'],
    organizationKeywords: ['ncs', 'national career service']
  }
];

export function sourceById(id: string): OfficialSource | undefined {
  return OFFICIAL_SOURCES.find((s) => s.id === id);
}

export function rotateSource(index: number): { source: OfficialSource; nextIndex: number } {
  const source = OFFICIAL_SOURCES[index % OFFICIAL_SOURCES.length];
  return { source, nextIndex: (index + 1) % OFFICIAL_SOURCES.length };
}
