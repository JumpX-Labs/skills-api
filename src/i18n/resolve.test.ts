import { describe, expect, it } from 'vitest';

import { isLocale, negotiateLocale, normalizeLocaleTag, resolveLocale } from './resolve.js';

describe('i18n resolve', () => {
  it('normalizes language tags', () => {
    expect(normalizeLocaleTag('zh-CN')).toBe('zh');
    expect(normalizeLocaleTag('ko-KR')).toBe('ko');
    expect(normalizeLocaleTag('fr-FR')).toBe('fr');
    expect(normalizeLocaleTag('en-US')).toBe('en');
  });

  it('negotiates from Accept-Language', () => {
    expect(negotiateLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(negotiateLocale('ko-KR,ko;q=0.9')).toBe('ko');
    expect(negotiateLocale('de-DE,de;q=0.9')).toBe('en');
  });

  it('resolves priority: path > query > cookie > accept', () => {
    expect(
      resolveLocale({
        pathLocale: 'zh',
        queryLang: 'fr',
        cookieLocale: 'ko',
        acceptLanguage: 'en-US',
      }),
    ).toBe('zh');

    expect(
      resolveLocale({
        queryLang: 'fr',
        cookieLocale: 'ko',
        acceptLanguage: 'en-US',
      }),
    ).toBe('fr');

    expect(
      resolveLocale({
        cookieLocale: 'ko',
        acceptLanguage: 'en-US',
      }),
    ).toBe('ko');
  });

  it('isLocale guards supported codes', () => {
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });
});
