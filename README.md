# Personal Headless CMS

个人博客与 CMS：NestJS + PostgreSQL 管理内容，一个 Nuxt 4 应用同时提供 Sakura 博客 `/zh`、`/en` 和管理工作台 `/admin`。只有一个站长账户，其他人都是访客。

项目独立实现前后端，不依赖 Halo 服务或 Halo 管理端。所有浏览器页面（包括登录、管理、错误和弹窗状态）采用统一的 Sakura / 二次元 / 少女风格；博客沿用已迁移的 Sakura 结构和资源，管理端使用 Element Plus，编辑和表格区域保持清晰易读。资源署名和许可证随前端资产保留。

## 已实现

- **双语**：简体中文/English 界面，按浏览器语言选择初始界面，footer 可切换并保存到 localStorage。文章、独立页面和其他公开内容可分别编辑双语版本；URL 使用 `/zh/...`、`/en/...`，缺少当前语言的已发布版本时自动展示另一语言的已发布内容。

- **博客**：Sakura 原版结构、CSS、本地图片与 SVG；Hero、波浪、明暗模式、响应式导航；首页、文章、归档、分类、标签、瞬间、图库、友链、搜索和独立页面。
- **管理工作台**：首次设置密码、登录、Markdown 编辑/预览、浏览器草稿恢复、发布/撤回/预约发布时间、媒体库、分类/标签、独立页面、瞬间、图库、友链、评论审核、网站配置、个人资料、改密和会话撤销。
- **后端**：NestJS 11、Prisma 7、PostgreSQL 17、SQL migration、Swagger、JWT、限流和输入校验。数据库只保存 Markdown 原文。
- **部署**：两个应用镜像、三个常驻服务：统一 Nuxt 静态前端/Nginx、后端、PostgreSQL。Nginx 同时提供页面和同源 API 网关；媒体持久化，提供部署脚本及数据库/媒体一致性备份。

当前前端为 SPA，`nuxt generate` 输出 `apps/frontend/.output/public`，生产不运行 Nuxt/Nitro 服务。SSR、SEO、sitemap、OpenGraph、Mermaid、Redis/BullMQ 和对象存储仍预留；没有多用户、主题商店或插件系统。详见 [架构](docs/architecture.md) 和 [资源许可](apps/frontend/public/sakura/ATTRIBUTION.md)。

## 本地开发

需要 Node.js 24、npm、Docker Engine 和 Compose v2。

```bash
cp .env.example .env
# 编辑 .env：JWT_SECRET 使用 openssl rand -hex 32 生成
npm ci
# 本地开发数据库绑定 127.0.0.1:5433
# 保留 .env.example 中面向宿主机的 DATABASE_URL
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
npm run dev:frontend
```

| 入口                | 地址                                   |
| ------------------- | -------------------------------------- |
| 博客                | http://localhost:3001                  |
| 管理工作台          | http://localhost:3001/admin            |
| 首次设置密码/登录   | http://localhost:3001/admin/login      |
| API                 | http://localhost:3000/api/v1           |
| Swagger（开发环境） | http://localhost:3000/api/docs         |
| OpenAPI             | http://localhost:3000/api/openapi.json |

开发前端将 `/api/` 代理到本地后端，不再启动独立博客和管理端进程。唯一登录邮箱固定为 `whoreahri@gmail.com`，不可修改。空库先运行 migration 和 seed，然后在登录页直接设置至少 16 字符的密码，无需额外初始化密钥。**新实例应先完成首次密码设置，再开放公网访问。** seed 幂等，不重置已有密码。本项目按全新双语数据库建模，不提供旧单语 schema 或旧 URL 的兼容迁移。无需配置 `ADMIN_EMAIL` 或 `ADMIN_PASSWORD`。

登录同时返回 Bearer Token 并设置 15 天 HttpOnly Cookie。浏览器使用 Cookie，在刷新后恢复会话；Token 不写入 localStorage/sessionStorage。退出仅撤销当前会话；“退出全部设备”和改密撤销全部会话。未保存编辑内容仍可从当前标签页的 sessionStorage 草稿恢复。详见 [认证设计](docs/architecture.md#认证上传与评论)。

**首次部署使用空数据库。** 双语 schema 是新项目基线，不要将旧版试验库直接用于此版本；脚本不会自动删除或覆盖旧数据库。

通过 `npm run db:migrate -- --name <change>` 创建迁移，生产使用 `db:deploy`。不要用 `db push` 替代 migration：唯一站长、固定邮箱等约束写在 SQL 中。

## 验证

```bash
npm run db:generate
npm run typecheck
npm run build
npm run lint
npm run format:check
npm run audit
npm run test:content
npm run test:unit
```

API 和浏览器测试使用**专用数据库**。API 测试要求数据库名以 `_test` 结尾且初始没有站长账户，会创建和清理测试数据；不要对开发或生产数据运行测试。

```bash
docker run -d --name cms-test -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=cms_test \
  -p 127.0.0.1:55439:5432 postgres:17-alpine
# 等 pg_isready 成功后继续
docker exec cms-test pg_isready -U cms -d cms_test
export DATABASE_URL=postgresql://cms:local-test-only@localhost:55439/cms_test
export JWT_SECRET=local-test-secret-at-least-32-characters
export MEDIA_ROOT=/tmp/cms-test-uploads
export E2E_PASSWORD=local-owner-test-password
export CORS_ORIGINS=http://localhost:3001
npm run db:deploy
npm test
node apps/backend/dist/seed.js
npx playwright install chromium
npm run test:e2e
docker rm -f cms-test
```

浏览器测试自动启动后端和统一前端；运行前关闭使用其他数据库的本地服务。也可用 `E2E_EXTERNAL=1`，同时设置 `E2E_BLOG_URL`、`E2E_ADMIN_URL`（同一前端 origin，含 `/admin`）、`E2E_API_URL` 验证已启动的隔离测试栈。测试覆盖首次设置密码、会话恢复、语言检测/切换/保存、独立双语编辑、已发布语言回退、编辑发布、Markdown 高亮与安全渲染、评论审核、路由加载、移动导航和无外部资源请求；截图存入 `test-results/`。

真实 Nginx 边界测试验证两个独立客户端的限流、伪造转发头的覆盖和匿名管理 API 拒绝。CI 安装 Nginx 并启用；本地安装 Nginx 后可设置 `CMS_NGINX_TEST=1`（必要时加 `CMS_NGINX_BIN=/绝对路径/nginx`）再运行 `npm test`，未启用时此项明确跳过。它只启动隔离的高端口测试代理，不修改系统 Nginx 配置。

依赖审计记录一项 Nuxt 开发 HTTPS 间接依赖例外，其他未审查的 high/critical 告警会阻断 CI，见 [架构文档](docs/architecture.md#依赖审计)。

## 部署与 CI

详见 [部署、备份与恢复](docs/operations.md)。`.env` 只保存运行环境与秘密；应用版本保存在独立的 `deployment/sha-<完整 SHA>.yml` 清单中。`./deploy.sh <完整 SHA>` 要求 checkout 与镜像版本一致、已跟踪文件无未提交修改；成功发布后通过 `./scripts/compose.sh` 管理当前版本。`./scripts/build.sh` 构建本地镜像，配合 `./scripts/compose.sh --images local` 使用。

PR 执行类型检查、构建、lint、格式、依赖审计、真实数据库测试、浏览器测试，以及两个应用镜像的构建。独立 Compose 验收用当前代码构建本地镜像，通过真实 Nginx 对生成的静态前端执行浏览器流程和截图，并验证空库首次启动、空库/有内容备份、删除源卷后恢复到新项目，以及媒体字节和迁移记录一致性。镜像构建/发布等待两类验证通过；合入 `main` 后推送：

- `ghcr.io/ahricool/cool-backend`
- `ghcr.io/ahricool/cool-frontend`

镜像提供 `main` 和 `sha-<完整 commit SHA>` 标签。生产用同一 SHA 固定两个应用镜像；流水线不自动部署服务器。
