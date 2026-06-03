export const LOCALES = ['en', 'fr', 'zh', 'ko'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export interface PageMessages {
  htmlLang: string;
  numberLocale: string;
  dateLocale: string;
  tagline: string;
  navGithub: string;
  navSkillsSh: string;
  navSpecification: string;
  navApiReference: string;
  statSkills: string;
  statSources: string;
  statOwners: string;
  statTotalInstalls: string;
  sectionTraffic: string;
  statRequestsTotal: string;
  statRequestsApi: string;
  statRequestsPages: string;
  statUptime: string;
  trafficSinceRestart: string;
  sectionTopSkills: string;
  sectionDirectory: string;
  sectionApiReference: string;
  colSkill: string;
  colSource: string;
  colInstalls: string;
  searchPlaceholder: string;
  btnPrev: string;
  btnNext: string;
  loading: string;
  empty: string;
  failedToLoad: string;
  /** Replace `{count}` with formatted number */
  skillsCountLabel: string;
  footerLastUpdated: string;
  langSwitcherAria: string;
  localeShort: Record<Locale, string>;
  endpoints: {
    list: string;
    top: string;
    sources: string;
    sourcesTop: string;
    owners: string;
    agents: string;
    stats: string;
    bySource: string;
    byId: string;
    bySourceId: string;
    files: string;
    content: string;
    tree: string;
  };
}
