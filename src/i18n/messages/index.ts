import type { Locale, PageMessages } from '../types.js';
import { en } from './en.js';
import { fr } from './fr.js';
import { ko } from './ko.js';
import { zh } from './zh.js';

const catalogs: Record<Locale, PageMessages> = { en, fr, zh, ko };

export function getMessages(locale: Locale): PageMessages {
  return catalogs[locale];
}
