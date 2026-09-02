import { NOTICE_KEYWORDS, type OfficialSource } from './sources';

const FETCH_HEADERS = {
  'User-Agent': 'ExamStatusBot/1.0 (+discovery; official-sources-only)',
  Accept: 'text/html,application/xhtml+xml'
};

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    return u.toString().replace(/\/$/, '') || u.toString();
  } catch {
    return null;
  }
}

function hostMatchesAllowlist(host: string, allowlist: string[]): boolean {
  const h = host.replace(/^www\./, '');
  return allowlist.some((d) => h === d || h.endsWith('.' + d));
}

function matchesNoticeKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return NOTICE_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Extract same-host notice links from HTML listing pages. */
export function extractNoticeLinks(html: string, pageUrl: string, allowlist: string[], limit = 40): string[] {
  const base = new URL(pageUrl);
  const host = base.hostname.replace(/^www\./, '');
  const seen = new Set<string>();
  const links: string[] = [];

  const hrefRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    const anchorText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const absolute = normalizeUrl(href, pageUrl);
    if (!absolute) continue;
    try {
      const u = new URL(absolute);
      const linkHost = u.hostname.replace(/^www\./, '');
      if (linkHost !== host && !hostMatchesAllowlist(linkHost, allowlist)) continue;
      if (!hostMatchesAllowlist(linkHost, allowlist)) continue;
      const pathLower = (u.pathname + u.search).toLowerCase();
      const combined = `${anchorText} ${pathLower}`;
      if (!matchesNoticeKeywords(combined)) continue;
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      links.push(absolute);
      if (links.length >= limit) break;
    } catch {
      /* skip invalid */
    }
  }
  return links;
}

export async function discoverFromSource(
  source: OfficialSource,
  allowlist: string[],
  maxPerListing = 25
): Promise<string[]> {
  const all: string[] = [];
  const seen = new Set<string>();

  for (const listingUrl of source.listingUrls) {
    try {
      const res = await fetch(listingUrl, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      const found = extractNoticeLinks(html, listingUrl, allowlist, maxPerListing);
      for (const url of found) {
        if (!seen.has(url)) {
          seen.add(url);
          all.push(url);
        }
      }
    } catch {
      /* skip failed listing */
    }
  }
  return all;
}
