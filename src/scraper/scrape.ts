/**
 * Skills.sh Scraper
 * Extracts skills data from the skills.sh website
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ScrapedSkill {
  source: string;
  skillId: string;
  name: string;
  installs: number;
}

export interface EnrichedSkill extends ScrapedSkill {
  /** GitHub owner */
  owner: string;
  /** GitHub repo */
  repo: string;
  /** Full GitHub URL */
  githubUrl: string;
  /** Display name (formatted from name) */
  displayName: string;
}

const SKILLS_API_BASE = 'https://skills.sh/api/skills/all-time';

interface SkillsPageResponse {
  skills: ScrapedSkill[];
  total: number;
  hasMore: boolean;
  page: number;
}

/**
 * Scrape skills from skills.sh using the paginated API.
 *
 * skills.sh moved from embedding all skills in the HTML (allTimeSkills)
 * to a paginated client-side API. This fetches all pages sequentially.
 */
export async function scrapeSkills(): Promise<ScrapedSkill[]> {
  const skills: ScrapedSkill[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${SKILLS_API_BASE}/${page}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as SkillsPageResponse;

    if (!Array.isArray(data.skills)) {
      throw new Error(`Invalid response format on page ${page}: expected skills array`);
    }

    skills.push(...data.skills);
    hasMore = data.hasMore;
    page++;

    if (page % 50 === 0) {
      console.info(`[Scraper] Fetched ${skills.length}/${data.total} skills (page ${page})...`);
    }
  }

  console.info(`[Scraper] Fetched ${skills.length} skills across ${page} pages`);
  return skills;
}

/**
 * Enrich skills with additional computed fields
 */
export function enrichSkills(skills: ScrapedSkill[]): EnrichedSkill[] {
  return skills.map(skill => {
    const parts = skill.source.split('/');
    const owner = parts[0] ?? '';
    const repo = parts[1] ?? '';
    return {
      ...skill,
      owner,
      repo,
      githubUrl: `https://github.com/${skill.source}`,
      displayName: formatDisplayName(skill.name),
    };
  });
}

/**
 * Format skill name as display name
 */
function formatDisplayName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get unique sources (repositories) from skills
 */
export function getUniqueSources(skills: ScrapedSkill[]): string[] {
  const sources = new Set<string>();
  for (const skill of skills) {
    sources.add(skill.source);
  }
  return Array.from(sources).sort();
}

/**
 * Get unique owners from skills
 */
export function getUniqueOwners(skills: ScrapedSkill[]): string[] {
  const owners = new Set<string>();
  for (const skill of skills) {
    const owner = skill.source.split('/')[0];
    if (owner) {
      owners.add(owner);
    }
  }
  return Array.from(owners).sort();
}

/**
 * Main scraper function - scrapes and saves to JSON file
 */
export async function scrapeAndSave(outputPath?: string): Promise<void> {
  console.info('Scraping skills from skills.sh...');

  const scrapedSkills = await scrapeSkills();
  console.info(`Found ${scrapedSkills.length} skills`);

  const enriched = enrichSkills(scrapedSkills);

  const output = {
    scrapedAt: new Date().toISOString(),
    totalSkills: enriched.length,
    totalSources: getUniqueSources(scrapedSkills).length,
    totalOwners: getUniqueOwners(scrapedSkills).length,
    skills: enriched,
  };

  const defaultPath = join(__dirname, '..', 'registry', 'scraped-skills.json');
  const filePath = outputPath ?? defaultPath;
  writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.info(`Saved to ${filePath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAndSave().catch(console.error);
}
