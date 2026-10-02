# Personal Headless CMS

个人博客与 CMS：NestJS + PostgreSQL 管理内容，Nuxt 4 展示 Sakura 博客，Vue 3 + Element Plus 提供独立管理端。只有一个站长账户，其他人都是访客。

项目独立实现前后端，不依赖 Halo 服务或 Halo 管理端。所有浏览器页面（包括登录、管理、错误和弹窗状态）采用统一的 Sakura / 二次元 / 少女风格；博客继续以已迁移的 Sakura 原版结构和资源为基准，管理端自行实现，编辑和表格区域保持清晰易读。上游主题与素材的许可署名保留在资源清单中。

## 已实现

- **博客**：迁移 Sakura 原模板结构、原 CSS、本地图片与 SVG；Hero、glitch、波浪、明暗模式、响应式导航。首页、文章、归档、分类、标签、瞬间、图库、友链、搜索和独立页面。
- **管理端**：登录、Markdown 编辑/预览、浏览器草稿恢复、发布/撤回/预约发布时间、媒体库、分类/标签、独立页面、瞬间、图库、友链、评论审核、网站配置、个人资料和改密。
- **后端**：NestJS 11、Prisma 7、PostgreSQL 17、SQL migration、Swagger、JWT、限流和输入校验。数据库只保存 Markdown 原文。
- **部署**：三端 Docker 镜像、Compose、Nginx、持久化媒体、部署脚本及数据库/媒体一致性备份。合入 main 后自动构建并推送 GHCR 镜像。

当前博客为 SPA；SSR、SEO、sitemap、OpenGraph、Mermaid、Redis/BullMQ 和对象存储仍按原计划预留。没有多用户、主题商店或插件系统。详见 [架构](docs/architecture.md) 和 [资源许可](licenses/THIRD-PARTY.md)。

## 本地开发

需要 Node.js 24、npm、Docker Compose v2。

```bash
cp .env.example .env
# 编辑 .env：JWT_SECRET 使用 openssl rand -hex 32 生成；设置自己的邮箱和至少 16 字符密码
npm ci
docker compose up -d --wait
npm run db:generate
npm run db:deploy
npm run build
npm run db:seed
```

分别在终端运行：

```bash
npm run build:watch -w @cms/backend
npm run dev
npm run dev:blog
npm run dev:admin
```

| 入口                | 地址                                   |
| ------------------- | -------------------------------------- |
| 博客                | http://localhost:3001                  |
| 后台                | http://localhost:5173/admin/           |
| API                 | http://localhost:3000/api/v1           |
| Swagger（开发环境） | http://localhost:3000/api/docs         |
| OpenAPI             | http://localhost:3000/api/openapi.json |

开发前端代理 `/api/` 到本地后端。初始化命令幂等，不覆盖已有密码，不创建第二个站长。Token 仅存内存，一小时过期；刷新后台页面需要重新登录，编辑器会保留当前标签页中的未保存草稿。改密使所有旧 Token 失效。

通过 `npm run db:migrate -- --name <change>` 创建迁移，生产使用 `db:deploy`。不要用 `db push` 替代 migration：唯一站长等约束写在 SQL 中。

## 验证

```bash
npm run db:generate
npm run typecheck
npm run build
npm run lint
npm run format:check
npm run audit
npm run test:content
```

API 和浏览器测试使用**专用数据库**，API 测试要求数据库名以 `_test` 结尾，并会清理测试数据：

```bash
docker run -d --name cms-test -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=cms_test \
  -p 127.0.0.1:55439:5432 postgres:17-alpine
export DATABASE_URL=postgresql://cms:local-test-only@localhost:55439/cms_test
export JWT_SECRET=local-test-secret-at-least-32-characters
export MEDIA_ROOT=/tmp/cms-test-uploads
export ADMIN_EMAIL=owner@example.test
export ADMIN_PASSWORD=local-owner-test-password
npm run db:deploy
npm test
node apps/backend/dist/seed.js
npx playwright install chromium
npm run test:e2e
docker rm -f cms-test
```

浏览器测试自动启动三端；运行前关闭使用其他数据库的本地服务。也可用 `E2E_EXTERNAL=1`，同时设置 `E2E_BLOG_URL`、`E2E_ADMIN_URL`（含 `/admin`）、`E2E_API_URL` 验证已启动的本地 Compose。测试覆盖编辑发布、Markdown 高亮与安全渲染、评论审核、路由加载、移动导航和无外部资源请求；截图存入 `test-results/`。

依赖审计精确记录一项尚无补丁的 Nuxt 开发 HTTPS 间接依赖例外，其他未审查的 high/critical 告警会阻断 CI，见 [架构文档](docs/architecture.md#依赖审计)。

## 部署与 CI

详见 [部署、备份与恢复](docs/operations.md)。PR 执行类型检查、构建、lint、格式、依赖审计、真实数据库测试、浏览器测试和三个镜像的构建。合入 `main` 后推送：

- `ghcr.io/ahricool/cool-backend`
- `ghcr.io/ahricool/cool-frontend`
- `ghcr.io/ahricool/cool-admin`

每个镜像提供 `main` 和 `sha-<完整 commit SHA>` 标签。服务器部署使用同一 SHA 的三个镜像；流水线不自动修改服务器。
