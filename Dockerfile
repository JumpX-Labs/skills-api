# syntax=docker/dockerfile:1
# JumpXAI · skills-api 部署镜像（Dokploy / 任意 Docker 主机）
# 多阶段：builder 编译 → runner 仅带生产依赖 + dist + 内置数据

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# 仅复制清单先装依赖，最大化构建缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建（tsup → dist/，并把 10MB 内置数据 cp 到 registry/）
COPY . .
RUN npm run build

# 剔除 devDependencies，只留生产依赖
RUN npm prune --omit=dev

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3456
ENV HOST=0.0.0.0

# 仅拷生产所需：node_modules（已 prune）、dist、内置数据、清单
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/registry ./registry
COPY --from=builder /app/package.json ./package.json

EXPOSE 3456

# 健康检查命中内置 /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/bin.js"]
