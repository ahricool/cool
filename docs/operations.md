# Linux 部署与恢复

## 首次安装

服务器需 Docker Engine、Compose v2、bash。将项目 checkout 到 `~/svr/cms`。准备 `.env`（chmod 600），不要提交凭据：

- POSTGRES_DB/USER/PASSWORD：生产数据库凭据。
- DATABASE_URL：`postgresql://用户:URL编码后的密码@database:5432/数据库`。容器内必须使用 `database`，本地开发用 localhost:5433。
- JWT_SECRET：`openssl rand -hex 32` 生成。
- ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME：唯一站长初始化。初始化完成后可从服务器 .env 移除 ADMIN_PASSWORD，seed 不自动重设密码。
- CMS_IMAGE：`ghcr.io/ahricool/cool-backend:sha-<完整 SHA>`。
- CORS_ORIGINS：允许的完整 origin，逗号分隔。同源访问可留空。
- HTTP_PORT：默认 8080。

GHCR package 若私有，先执行 docker login ghcr.io，使用有 read:packages 的凭据。仓库 Actions 必须允许 GITHUB_TOKEN 写 packages；流水线通过内置 Token 推送，无需放入个人访问令牌。

```bash
chmod 600 .env
./deploy.sh
docker compose -f docker-compose.prod.yml run --rm seed
curl --fail http://127.0.0.1:8080/api/v1/health
```

公网入口需 TLS：可以由已有网关终止 HTTPS，并把 HTTP_PORT 绑定到 `127.0.0.1:8080`（Compose 支持该值），或给 Nginx 配置证书。仓库未含域名/证书配置。不要在公网 HTTP 上传送站长密码或 token。

本地构建用 `./scripts/build.sh`；不从 registry 拉取时手动运行：

```bash
docker compose -f docker-compose.prod.yml up -d --wait database
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml run --rm seed
docker compose -f docker-compose.prod.yml up -d --wait backend proxy
```

`deploy.sh` 顺序是拉取 → 数据库健康 → 备份 → migration → 应用健康。迁移失败停止部署，不启动新应用。无 git checkout/pull 的隐式操作；部署哪个版本由 checkout 和 CMS_IMAGE 决定。日常迁移应兼容前一应用版本；破坏性迁移需要停机方案。Phase 1 首次安装没有旧版本兼容问题。

## 备份与恢复

`./backup.sh` 写 PostgreSQL custom format，权限受 umask 077 限制，只有成功后才重命名。建议在宿主机 cron 定时运行并复制到另一台机器；当前不自动清理历史备份。

先在隔离数据库演练恢复，确认成功后才对生产执行。以下操作会覆盖目标数据库对象，生产恢复前停止 backend/proxy 并备份当前数据：

```bash
docker compose -f docker-compose.prod.yml stop proxy backend
docker compose -f docker-compose.prod.yml exec -T database \
  sh -c 'pg_restore --exit-on-error --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < backups/<备份文件>.dump
docker compose -f docker-compose.prod.yml up -d --wait backend proxy
```

回滚先检查 migration 是否兼容旧镜像，再把 CMS_IMAGE 改回旧 SHA。如果必须恢复数据库，恢复后检查 `_prisma_migrations` 与应用版本一致；不能仅换镜像假设 schema 自动回滚。

## 站长凭证维护

Phase 1 无密码重置 HTTP API。服务器维护者可进入 backend 容器，使用 `dist/password.js` 的 hashPassword 生成哈希，通过 Prisma 更新唯一 users 记录；不要把明文密码写进 SQL/日志或命令历史。改密后同时轮换 JWT_SECRET 并重启 backend，使所有旧 token 失效。后续 Admin 阶段加入需要旧密码验证的密码修改功能。

## 可观测性与限制

健康接口检查数据库连接。查看 `docker compose -f docker-compose.prod.yml logs --tail=100 backend`。应用以非 root 用户运行，数据库没有宿主机端口映射。生产关闭 Swagger UI，保留 OpenAPI JSON。当前无自动服务器发布，无 Redis/MinIO，无前端容器；这三项随后续阶段增量接入。
