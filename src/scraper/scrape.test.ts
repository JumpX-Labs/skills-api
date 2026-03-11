import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeSkills } from './scrape.js';

const mockSkill = (i: number) => ({
  source: `owner-${i}/repo-${i}`,
  skillId: `skill-${i}`,
  name: `skill-${i}`,
  installs: 100 - i,
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('scrapeSkills', () => {
  it('fetches a single page when hasMore is false', async () => {
    const skills = Array.from({ length: 50 }, (_, i) => mockSkill(i));
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ skills, total: 50, hasMore: false, page: 0 }),
    );

    const result = await scrapeSkills();

    expect(result).toHaveLength(50);
    expect(result[0]).toEqual(skills[0]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/0'));
  });

  it('paginates through multiple pages', async () => {
    const page0 = Array.from({ length: 200 }, (_, i) => mockSkill(i));
    const page1 = Array.from({ length: 50 }, (_, i) => mockSkill(200 + i));

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ skills: page0, total: 250, hasMore: true, page: 0 }))
      .mockResolvedValueOnce(Response.json({ skills: page1, total: 250, hasMore: false, page: 1 }));

    const result = await scrapeSkills();

    expect(result).toHaveLength(250);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/0'));
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/1'));
  });

  it('throws on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
    );

    await expect(scrapeSkills()).rejects.toThrow('Failed to fetch page 0: 500 Internal Server Error');
  });

  it('throws on invalid response format', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ skills: 'not-an-array', total: 0, hasMore: false, page: 0 }),
    );

    await expect(scrapeSkills()).rejects.toThrow('Invalid response format on page 0');
  });

  it('returns empty array when first page has no skills', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ skills: [], total: 0, hasMore: false, page: 0 }),
    );

    const result = await scrapeSkills();
    expect(result).toHaveLength(0);
  });

  it('throws when a later page fails (e.g. rate limit)', async () => {
    const page0 = Array.from({ length: 200 }, (_, i) => mockSkill(i));

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ skills: page0, total: 400, hasMore: true, page: 0 }))
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' }));

    await expect(scrapeSkills()).rejects.toThrow('Failed to fetch page 1: 429 Too Many Requests');
  });
});
