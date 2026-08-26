export function getLang(url: URL, cookieHeader: string | null): 'en' | 'hi' {
  const q = url.searchParams.get('lang');
  if (q === 'hi' || q === 'en') return q;
  const match = cookieHeader?.match(/(?:^|;\s*)examstatus_lang=(hi|en)/);
  if (match) return match[1] as 'en' | 'hi';
  return 'en';
}

export function langLink(pathname: string, lang: 'en' | 'hi', search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.set('lang', lang);
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

export function pickLang<T extends string | null | undefined>(en: T, hi: T, lang: 'en' | 'hi'): string {
  if (lang === 'hi' && hi && String(hi).trim()) return String(hi);
  return String(en || '');
}
