# Personal Headless CMS

面向个人站长的博客 CMS。内容保存在 PostgreSQL，NestJS 提供独立 JSON API；后续接入 Nuxt 4 Sakura 博客和 Vue 3 管理端。

## 当前交付：Phase 1

- NestJS 11、Prisma 7、PostgreSQL 17、Node.js 24、TypeScript strict。
- 唯一站长初始化、密码哈希、JWT 登录、受保护的文章 CRUD。
- 草稿、发布、归档；公开列表、详情、分类、标签、归档、搜索及公开配置。
- SQL migration、Swagger、真实 PostgreSQL 集成测试。
- Docker、Compose、Nginx、备份/部署脚本及 main 合并后 GHCR 镜像构建。

尚未实现 Nuxt、Sakura 迁移、Admin UI、上传、评论和配置编辑。详见 [架构与阶段计划](docs/architecture.md)。

## 本地开发

```bash
cp .env.example .env
# 编辑 .env：JWT_SECRET 至少 32 个随机字符，ADMIN_PASSWORD 至少 16 个字符
# 可用 openssl rand -hex 32 生成 JWT_SECRET
npm ci
docker compose up -d --wait
npm run db:generate
npm run db:deploy
npm run build
npm run db:seed
npm run dev
```

API：`http://localhost:3000/api/v1`；Swagger：`http://localhost:3000/api/docs`；契约：`/api/openapi.json`。

`dev` 监视编译输出；开发时在另一终端运行 `npm run build:watch -w @cms/backend`。创建 schema 变更用 `npm run db:migrate -w @cms/backend -- --name <change>`（或直接在 backend workspace 执行 Prisma CLI）；生产只用 migrate deploy。不要用 db push 替代 migration：唯一站长等数据库约束保存在 SQL migration 中。

```bash
curl -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"你在 .env 中设置的密码"}'
# 后台请求携带 Authorization: Bearer <accessToken>
```

初始化命令幂等，不覆盖已有密码，不创建第二个站长。无注册入口。Token 一小时过期，重新登录获取；第一阶段无 refresh token。密码遗失时按 [运维文档](docs/operations.md) 操作。

## 验证

```bash
npm run db:generate
npm run build
npm run lint
npm run format:check
npm audit --audit-level=high
```

集成测试需要**专用空数据库**，名字必须以 `_test` 结尾：

```bash
docker run -d --name cms-test -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=test-password -e POSTGRES_DB=cms_test \
  -p 127.0.0.1:55439:5432 postgres:17-alpine
export DATABASE_URL=postgresql://cms:test-password@localhost:55439/cms_test
export JWT_SECRET=test-secret-at-least-32-characters-long
npm run db:deploy
npm test
docker rm -f cms-test
```

测试通过真实 HTTP 和数据库验证登录、鉴权、文章生命周期、分页校验、敏感字段过滤、事务回滚和初始化。Markdown 目前只验证原文保存；渲染、代码高亮和页面加载测试随 Phase 2 实现。

## 部署与 CI

详见 [部署、备份与恢复](docs/operations.md)。PR 执行编译、lint、格式、依赖审计、数据库测试及镜像构建。合入 `main` 后同样验证并推送：

- `ghcr.io/ahricool/cool-backend:main`
- `ghcr.io/ahricool/cool-backend:sha-<完整 commit SHA>`

流水线不自动更新服务器。部署使用固定 SHA 标签，并在 migration 前备份数据库。
