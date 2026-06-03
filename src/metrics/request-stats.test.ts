import { describe, expect, it, beforeEach } from 'vitest';

import {
  classifyRequestPath,
  getRequestStats,
  recordRequest,
  resetRequestStatsForTests,
} from './request-stats.js';

describe('request-stats', () => {
  beforeEach(() => {
    resetRequestStatsForTests();
  });

  it('classifies paths', () => {
    expect(classifyRequestPath('/api/skills')).toBe('api');
    expect(classifyRequestPath('/')).toBe('page');
    expect(classifyRequestPath('/zh')).toBe('page');
    expect(classifyRequestPath('/health')).toBe('other');
  });

  it('increments counters', () => {
    recordRequest('/api/skills');
    recordRequest('/zh');
    recordRequest('/health');

    const stats = getRequestStats();
    expect(stats.total).toBe(3);
    expect(stats.api).toBe(1);
    expect(stats.page).toBe(1);
    expect(stats.other).toBe(1);
  });
});
