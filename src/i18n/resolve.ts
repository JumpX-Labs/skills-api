import { DEFAULT_LOCALE, LOCALES, type Locale } from './types.js';

const LOCALE_SET = new Set<string>(LOCALES);

/** Map ?lang= / Accept-Language tokens to supported locale */
export function normalizeLocaleTag(tag: string): Locale | null {
  const lower = tag.trim().toLowerCase();
  if (!lower) return null;

  if (LOCALE_SET.has(lower)) return lower as Locale;

  const primary = lower.split('-')[0];
  if (LOCALE_SET.has(primary)) return primary as Locale;

  if (primary === 'zh' || lower.startsWith('zh-')) return 'zh';
  if (primary === 'ko' || lower.startsWith('ko-')) return 'ko';
  if (primary === 'fr' || lower.startsWith('fr-')) return 'fr';
  if (primary === 'en' || lower.startsWith('en-')) return 'en';

  return null;
}

export function isLocale(value: string): value is Locale {
  return LOCALE_SET.has(value);
}

export function negotiateLocale(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const parts = acceptLanguage.split(',').map(part => {
    const [tag, qPart] = part.trim().split(';q=');
    const q = qPart ? parseFloat(qPart) : 1;
    return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
  });

  parts.sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    const locale = normalizeLocaleTag(tag);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

export function resolveLocale(input: {
  pathLocale?: string;
  queryLang?: string;
  cookieLocale?: string;
  acceptLanguage?: string;
}): Locale {
  if (input.pathLocale && isLocale(input.pathLocale)) return input.pathLocale;

  if (input.queryLang) {
    const fromQuery = normalizeLocaleTag(input.queryLang);
    if (fromQuery) return fromQuery;
  }

  if (input.cookieLocale && isLocale(input.cookieLocale)) return input.cookieLocale;

  return negotiateLocale(input.acceptLanguage);
}

export function localePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}
