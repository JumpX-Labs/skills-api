# skills-api 部署手册（Dokploy + Cloudflare R2）

> JumpXAI 自建 skills.sh 数据 API。fork 自 [mastra-ai/skills-api](https://github.com/mastra-ai/skills-api)（MIT）。
> 仓库：`JumpX-Labs/skills-api`。本机验证：`npm run dev` → `http://localhost:3456`，34,311 个 skills。

## 架构

```
[调度器/定时] 抓 GitHub ──► 写 skills-data.json ──► Cloudflare R2 (jumpxai-skills)
                                                          │ S3 读取
JumpXAI 平台(next-app 服务端) ──HTTP──► skills-api(Dokploy 容器) ──► 读 R2
```

- 服务器：Hono + Node 22，容器化（见 `Dockerfile`），常驻。
- 数据：放 **R2**（S3 兼容）。**首次启动若桶为空，自动用仓库内置 10MB 数据 seed**，无需手动上传。
- 数据层有内存缓存（10MB 仅首次解析），响应带 ETag/Cache-Control。

---

## 一、准备 Cloudflare R2（一次性）

1. CF 控制台 → R2 → 创建桶 **`jumpxai-skills`**。
2. R2 → Manage API Tokens → 建一个 **Object Read & Write** token，限定该桶。记下：
   - **Access Key ID** → `AWS_ACCESS_KEY_ID`
   - **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`
3. 端点：`https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `S3_ENDPOINT`（账户 ID 在 R2 概览页）。
4. （增量维护用）GitHub → Settings → Developer settings → 生成只读 **PAT** → `GITHUB_TOKEN`。

> R2 同一个桶还会存 `skill-files/*`（GitHub 抓来的 skill 正文缓存）和 `validation-cache.json`，正常。

## 二、Dokploy 部署

1. Dokploy → **Create Application** → Source = **GitHub** → 仓库 `JumpX-Labs/skills-api`，分支 `main`。
2. **Build Type = Dockerfile**（仓库根已有 `Dockerfile`）。
3. **Port = 3456**（容器内监听口；Dokploy 反代到你的域名）。
4. **Environment**：按下表填（参考 `.env.example`）。
5. 绑域名（如 `skills-api.jumpxai.com`）→ 开 HTTPS → Deploy。

### 环境变量

| 变量 | 值 | 说明 |
|------|----|----|
| `PORT` | `3456` | 容器监听口 |
| `CORS_ORIGIN` | `https://jumpxai.com,https://jumpxai.vercel.app` | 收紧到平台域名（也可先 `*`） |
| `S3_BUCKET` | `jumpxai-skills` | 配了即启用 R2 |
| `S3_KEY` | `skills-data.json` | 数据对象名 |
| `S3_REGION` | `auto` | R2 用 auto |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | R2 端点 |
| `AWS_ACCESS_KEY_ID` | `<R2 token access key>` | R2 凭证 |
| `AWS_SECRET_ACCESS_KEY` | `<R2 token secret>` | R2 凭证 |
| `AUTO_REFRESH` | `true` | 开自动增量刷新 |
| `REFRESH_INTERVAL` | `720` | 分钟（720=12h） |
| `GITHUB_TOKEN` | `<PAT>` | scraper 抓 GitHub 防限流 |
| `API_KEY` | `<随机长串>` | **可选**；仅保护 `/api/admin/*`，见 README「API key」 |

> **常见故障**：若把 `API_KEY` 误配成「全站 `/api` 都要 key」（旧版行为或反代规则），首页 Directory 会显示 Failed to load，但顶部统计仍正常。当前版本只需对 admin 带 key；`/api/skills*` 与平台 `SKILLS_API_URL` 调用均无需 key。

## 三、验证

```bash
curl https://skills-api.jumpxai.com/health                 # {"status":"ok"}
curl https://skills-api.jumpxai.com/api/skills/stats        # totalSkills: 34000+
curl 'https://skills-api.jumpxai.com/api/skills?pageSize=3' # 列表（无需 API key）
curl -H "x-api-key: $API_KEY" https://skills-api.jumpxai.com/api/admin/status  # 仅当配置了 API_KEY
```
首次启动日志应见 `[Storage] S3 bucket empty, seeding from bundled data` → R2 桶里出现 `skills-data.json`。

## 四、增量维护

数据快照来自上游（约 2026-01），靠以下任一保持新鲜：
- **自动**：`AUTO_REFRESH=true`（已在调度器内，按 `REFRESH_INTERVAL` 抓取并写回 R2）。
- **手动触发**：`POST /api/admin/refresh`。
- **离线重抓**：容器内 `npm run scrape`（需 `GITHUB_TOKEN`）。

> 自上游同步新功能：`git fetch upstream && git merge upstream/main`（upstream = mastra-ai/skills-api），再 Dokploy 重新部署。

## 五、接入 JumpXAI 平台

平台 `apps/next-app` 加环境变量 `SKILLS_API_URL=https://skills-api.jumpxai.com`，importer/列表服务端调用其 `/api/skills*`，把精选子集映射成 `CuratedSkillSeed`（中文 title/level/风险等为平台编辑层，源数据不含）。

## 注意

- **fork 是 public**（公开仓的 fork 无法设私有）。仓内无密钥（全走 Dokploy env），可接受；若必须私有需「复制非 fork」，但会失去与上游的 `git merge` 同步能力。
- 许可证 **MIT**，前端展示请署名 skills.sh / mastra。
