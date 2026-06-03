export type RequestBucket = 'api' | 'page' | 'other';

export interface RequestStatsSnapshot {
  startedAt: string;
  uptimeSeconds: number;
  total: number;
  api: number;
  page: number;
  other: number;
}

const startedAt = new Date();

const counts = {
  total: 0,
  api: 0,
  page: 0,
  other: 0,
};

const PAGE_PATH = /^\/(en|fr|zh|ko)?\/?$/;

export function classifyRequestPath(path: string): RequestBucket {
  if (path.startsWith('/api')) return 'api';
  if (PAGE_PATH.test(path)) return 'page';
  return 'other';
}

export function recordRequest(path: string): void {
  const bucket = classifyRequestPath(path);
  counts.total += 1;
  counts[bucket] += 1;
}

export function getRequestStats(): RequestStatsSnapshot {
  const uptimeSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds,
    total: counts.total,
    api: counts.api,
    page: counts.page,
    other: counts.other,
  };
}

/** @internal test helper */
export function resetRequestStatsForTests(): void {
  counts.total = 0;
  counts.api = 0;
  counts.page = 0;
  counts.other = 0;
}
