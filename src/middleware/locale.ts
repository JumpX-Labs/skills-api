import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { getMessages } from '../i18n/messages/index.js';
import { isLocale, resolveLocale } from '../i18n/resolve.js';
import type { Locale } from '../i18n/types.js';

function localeFromPath(pathname: string): Locale | undefined {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : undefined;
}

export const LOCALE_COOKIE = 'skills_api_locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type AppVariables = {
  locale: Locale;
  messages: ReturnType<typeof getMessages>;
};

export const localeMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const pathLocale = localeFromPath(c.req.path) ?? c.req.param('locale');
  const locale = resolveLocale({
    pathLocale,
    queryLang: c.req.query('lang'),
    cookieLocale: getCookie(c, LOCALE_COOKIE),
    acceptLanguage: c.req.header('Accept-Language'),
  });

  c.set('locale', locale);
  c.set('messages', getMessages(locale));

  setCookie(c, LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'Lax',
    httpOnly: false,
  });

  await next();
});
