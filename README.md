# @mastra/skills-api

![skills-api](assets/screenshot.png)

API server for [skills.sh](https://skills.sh) -- the open marketplace for Agent Skills.

Serves a browsable registry of 34,000+ skills from 2,800+ repositories. Use it as a standalone server or as a library in your own project.

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:3456
```

For production:

```bash
pnpm build && pnpm start
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3456` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `CORS_ORIGIN` | `*` | CORS origin |
| `API_KEY` | - | Optional secret; **only** protects `/api/admin/*` when set |
| `AUTO_REFRESH` | `false` | Auto-refresh scheduler |
| `REFRESH_INTERVAL` | `30` | Refresh interval (minutes, min 5) |
| `SKILLS_DATA_DIR` | - | Filesystem storage directory |

### API key (`API_KEY`)

`API_KEY` is **optional**. When set, it gates **admin routes only** (`/api/admin/*`). Public read APIs and the homepage Directory stay open without a key.

| Scope | Requires `API_KEY`? |
|---|---|
| `GET /`, `GET /health` | No |
| `GET /api/skills`, `/api/skills/*` (list, search, stats, content) | No |
| `GET/POST /api/admin/*` (refresh, scheduler) | **Yes** (if `API_KEY` is set) |

**Do not** put `API_KEY` on all `/api/*` in a reverse proxy or WAF rule — that breaks the landing page Directory, which calls `GET /api/skills` from the browser without headers.

**Header** (either works):

```http
x-api-key: <your-secret>
```

or

```http
Authorization: Bearer <your-secret>
```

**Examples**

```bash
# Public — no key
curl 'https://skills-api.example.com/api/skills?pageSize=5'
curl https://skills-api.example.com/api/skills/stats

# Admin — key required when API_KEY is configured
export API_KEY='your-long-random-secret'
curl -H "x-api-key: $API_KEY" https://skills-api.example.com/api/admin/status
curl -X POST -H "x-api-key: $API_KEY" https://skills-api.example.com/api/admin/refresh
```

**Production (Dokploy / Docker)**

1. Generate a long random value (e.g. `openssl rand -hex 32`).
2. Set `API_KEY` in the deployment environment panel only — never commit it.
3. Redeploy after changing `API_KEY`.
4. JumpXAI platform and other server-side clients call `/api/skills*` **without** a key; only operators/scripts that trigger refresh need the key.

**Local dev**

```bash
# No key — everything including admin is open (default)
pnpm dev

# With key — admin routes require header; skills API stays public
API_KEY=dev-secret pnpm dev
curl -H 'x-api-key: dev-secret' http://localhost:3456/api/admin/status
```

See also [DEPLOY.md](./DEPLOY.md) for JumpXAI R2 + Dokploy setup.

### S3 Storage

For production, configure S3 (works with AWS, MinIO, Cloudflare R2):

| Variable | Default | Description |
|---|---|---|
| `S3_BUCKET` | - | Bucket name (enables S3) |
| `S3_KEY` | `skills-data.json` | Object key |
| `S3_REGION` | `us-east-1` | AWS region |
| `S3_ENDPOINT` | - | Custom endpoint for S3-compatible services |

```bash
S3_BUCKET=my-bucket AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx pnpm start
```

Storage priority: **S3 > Filesystem > Bundled data**. When both S3 and filesystem are configured, data is saved to both.

## API

The root page (`/`) serves a browsable directory with search and API documentation. All data endpoints are under `/api`.

### Skills

| Endpoint | Description |
|---|---|
| `GET /api/skills` | List and search skills (paginated) |
| `GET /api/skills/top` | Top skills by installs |
| `GET /api/skills/:skillId` | Skill by ID |
| `GET /api/skills/:owner/:repo/:skillId` | Skill by source and ID |
| `GET /api/skills/:owner/:repo/:skillId/files` | Skill file contents from GitHub |
| `GET /api/skills/:owner/:repo/:skillId/content` | Parsed SKILL.md from GitHub |
| `GET /api/skills/by-source/:owner/:repo` | All skills from a repo |

**Search parameters** for `GET /api/skills`:

| Parameter | Default | Description |
|---|---|---|
| `query` | - | Search text |
| `owner` | - | Filter by GitHub owner |
| `repo` | - | Filter by repository |
| `sortBy` | `installs` | `name` or `installs` |
| `sortOrder` | `desc` | `asc` or `desc` |
| `page` | `1` | Page number |
| `pageSize` | `20` | Items per page (max 100) |

### Metadata

| Endpoint | Description |
|---|---|
| `GET /api/skills/sources` | All source repositories with counts |
| `GET /api/skills/sources/top` | Top sources by installs |
| `GET /api/skills/owners` | All owners with counts |
| `GET /api/skills/agents` | Supported AI agents |
| `GET /api/skills/stats` | Registry statistics |

### Admin

Requires `x-api-key` (or `Authorization: Bearer`) when `API_KEY` is set. See [API key](#api-key-api_key).

| Endpoint | Description |
|---|---|
| `GET /api/admin/status` | Scheduler and data status |
| `POST /api/admin/refresh` | Trigger manual refresh |
| `POST /api/admin/scheduler/start?interval=30` | Start auto-refresh |
| `POST /api/admin/scheduler/stop` | Stop auto-refresh |

## Updating Data

```bash
# Manual scrape
pnpm scrape

# Auto-refresh via env
AUTO_REFRESH=true REFRESH_INTERVAL=30 pnpm start

# Via admin API (add -H 'x-api-key: ...' if API_KEY is set)
curl -X POST http://localhost:3456/api/admin/refresh
```

## Library Usage

```typescript
import { createSkillsApiServer } from '@mastra/skills-api';

const app = createSkillsApiServer({
  cors: true,
  corsOrigin: 'https://your-domain.com',
  prefix: '/api',
});
```

### Direct Data Access

```typescript
import {
  skills,
  metadata,
  getSources,
  getOwners,
  getTopSkills,
  supportedAgents,
} from '@mastra/skills-api';

console.log(`${skills.length} skills, scraped ${metadata.scrapedAt}`);
```

### Scraper

```typescript
import { scrapeAndSave } from '@mastra/skills-api';

await scrapeAndSave();
```

### GitHub Content

```typescript
import { fetchSkillFromGitHub } from '@mastra/skills-api';

const result = await fetchSkillFromGitHub('vercel-labs', 'agent-skills', 'vercel-react-best-practices');
if (result.success) {
  console.log(result.content.instructions);
}
```

## Development

```bash
pnpm dev        # Dev server with watch
pnpm test       # Run tests
pnpm build      # Production build
pnpm scrape     # Update skills data
```

## License

MIT
