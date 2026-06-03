# skills-api

[English](./README.md) · 简体中文

![skills-api](assets/screenshot.png)

面向 [skills.sh](https://skills.sh) 的 API 服务——开放的 Agent Skills 市场数据层。

提供可浏览的 Skills 注册表（规模随快照与刷新变化，见 `/api/skills/stats`），数据来自数千个 GitHub 仓库。可独立部署为 HTTP 服务，也可作为库嵌入你的项目。

> 本仓库为 JumpXAI 维护的 fork：[JumpX-Labs/skills-api](https://github.com/JumpX-Labs/skills-api)，上游为 [mastra-ai/skills-api](https://github.com/mastra-ai/skills-api)（MIT）。生产部署见 [DEPLOY.md](./DEPLOY.md)。

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3456
```

生产环境：

```bash
pnpm build && pnpm start
```

## 配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3456` | 服务监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `CORS_ORIGIN` | `*` | 允许跨域的来源 |
| `API_KEY` | - | 可选密钥；设置后**仅**保护 `/api/admin/*` |
| `AUTO_REFRESH` | `false` | 是否开启自动刷新调度器 |
| `REFRESH_INTERVAL` | `30` | 刷新间隔（分钟） |
| `SKILLS_DATA_DIR` | - | 本地文件系统数据目录 |
| `GITHUB_TOKEN` | - | 可选；抓取/校验 GitHub 时提高限额、防 403 |

### API 密钥（`API_KEY`）

`API_KEY` **可选**。设置后仅对 **admin 路由**（`/api/admin/*`）鉴权；公开读接口与首页 Directory 列表**不需要**密钥。

| 范围 | 是否需要 `API_KEY` |
|---|---|
| `GET /`、`GET /health` | 否 |
| `GET /api/skills`、`/api/skills/*`（列表、搜索、统计、正文等） | 否 |
| `GET/POST /api/admin/*`（刷新、调度器） | **是**（已配置 `API_KEY` 时） |

**注意**：不要在反向代理或 WAF 里对**整个** `/api/*` 统一要求密钥——首页 Directory 会在浏览器里无头请求 `GET /api/skills`，那样会导致列表加载失败。

**请求头**（二选一）：

```http
x-api-key: <你的密钥>
```

或

```http
Authorization: Bearer <你的密钥>
```

**示例**

```bash
# 公开接口 — 无需密钥
curl 'https://skills-api.example.com/api/skills?pageSize=5'
curl https://skills-api.example.com/api/skills/stats

# Admin — 配置了 API_KEY 时必须带密钥
export API_KEY='你的长随机串'
curl -H "x-api-key: $API_KEY" https://skills-api.example.com/api/admin/status
curl -X POST -H "x-api-key: $API_KEY" https://skills-api.example.com/api/admin/refresh
```

**生产环境（Dokploy / Docker）**

1. 生成足够长的随机值（例如 `openssl rand -hex 32`）。
2. 仅在部署平台的环境变量里设置 `API_KEY`，**不要**写入仓库或提交到 git。
3. 修改 `API_KEY` 后需重新部署。
4. JumpXAI 平台等服务端调用 `/api/skills*` **无需**密钥；只有运维脚本触发刷新等 admin 操作才需要。

**本地开发**

```bash
# 不设密钥 — admin 也开放（默认）
pnpm dev

# 设密钥 — admin 需带头；skills API 仍公开
API_KEY=dev-secret pnpm dev
curl -H 'x-api-key: dev-secret' http://localhost:3456/api/admin/status
```

JumpXAI 的 R2 + Dokploy 部署步骤见 [DEPLOY.md](./DEPLOY.md)。

### S3 存储

生产环境可配置 S3（AWS、MinIO、Cloudflare R2 等兼容实现）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `S3_BUCKET` | - | 桶名（设置即启用 S3） |
| `S3_KEY` | `skills-data.json` | 对象键名 |
| `S3_REGION` | `us-east-1` | 区域（R2 常用 `auto`） |
| `S3_ENDPOINT` | - | 自定义端点（R2 / MinIO 等） |

```bash
S3_BUCKET=my-bucket AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx pnpm start
```

存储优先级：**S3 > 文件系统 > 内置快照**。若 S3 与文件系统同时配置，写入时会同步到两处。

## API

根路径 `/` 提供可搜索的 Directory 与 API 说明；数据接口均在 `/api` 下。

**着陆页语言**：`en`（默认）、`fr`、`zh`、`ko` — 访问 `/zh`、`/fr`、`/ko`，或在 `/` 使用 `?lang=zh`。偏好写入 Cookie `skills_api_locale`；未指定时根据 `Accept-Language` 协商。

### Skills

| 端点 | 说明 |
|---|---|
| `GET /api/skills` | 列表与搜索（分页） |
| `GET /api/skills/top` | 按安装量排序的 Top 列表 |
| `GET /api/skills/:skillId` | 按 skill ID 查询（可能不唯一，返回首个匹配） |
| `GET /api/skills/:owner/:repo/:skillId` | 按来源仓库 + ID 查询 |
| `GET /api/skills/:owner/:repo/:skillId/files` | 从 GitHub 拉取 skill 目录下文件 |
| `GET /api/skills/:owner/:repo/:skillId/content` | 解析后的 SKILL.md |
| `GET /api/skills/:owner/:repo/:skillId/tree` | 文件树（路径与大小）+ 仓库 stars/forks |
| `GET /api/skills/by-source/:owner/:repo` | 某仓库下的全部 skills |

`GET /api/skills` **查询参数**：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `query` | - | 搜索关键词 |
| `owner` | - | 按 GitHub owner 过滤 |
| `repo` | - | 按仓库名过滤 |
| `sortBy` | `installs` | `name` 或 `installs` |
| `sortOrder` | `desc` | `asc` 或 `desc` |
| `page` | `1` | 页码 |
| `pageSize` | `20` | 每页条数（最大 100） |

### 元数据

| 端点 | 说明 |
|---|---|
| `GET /api/skills/sources` | 全部来源仓库及 skill 数量 |
| `GET /api/skills/sources/top` | 按安装量排序的来源 |
| `GET /api/skills/owners` | 全部 owner 及数量 |
| `GET /api/skills/agents` | 支持的 AI Agent 列表 |
| `GET /api/skills/stats` | 注册表统计 |

### Admin

在配置了 `API_KEY` 时，需使用 `x-api-key` 或 `Authorization: Bearer`。详见 [API 密钥](#api-密钥api_key)。

| 端点 | 说明 |
|---|---|
| `GET /api/admin/status` | 调度器与数据状态 |
| `POST /api/admin/refresh` | 手动触发刷新 |
| `POST /api/admin/scheduler/start?interval=30` | 启动自动刷新 |
| `POST /api/admin/scheduler/stop` | 停止自动刷新 |

## 更新数据

```bash
# 手动抓取
pnpm scrape

# 环境变量开启自动刷新
AUTO_REFRESH=true REFRESH_INTERVAL=30 pnpm start

# 通过 admin API（若设置了 API_KEY 需加 -H 'x-api-key: ...'）
curl -X POST http://localhost:3456/api/admin/refresh
```

后台抓取 skills.sh 时可能遇到 **429**，调度器/scraper 已做间隔与退避；与访客访问本 API 无关。

## 作为库使用

```typescript
import { createSkillsApiServer } from '@mastra/skills-api';

const app = createSkillsApiServer({
  cors: true,
  corsOrigin: 'https://your-domain.com',
  prefix: '/api',
});
```

### 直接读注册表数据

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

### 抓取器

```typescript
import { scrapeAndSave } from '@mastra/skills-api';

await scrapeAndSave();
```

### GitHub 正文

```typescript
import { fetchSkillFromGitHub } from '@mastra/skills-api';

const result = await fetchSkillFromGitHub('vercel-labs', 'agent-skills', 'vercel-react-best-practices');
if (result.success) {
  console.log(result.content.instructions);
}
```

## 开发

```bash
pnpm dev        # 开发模式（watch）
pnpm test       # 测试
pnpm build      # 生产构建
pnpm scrape     # 更新 skills 快照
```

## 许可证

MIT（基于上游 skills-api / skills.sh 生态，使用与再分发请保留相应署名。）
