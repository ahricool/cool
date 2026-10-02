# Linux 部署、备份与恢复

## 首次安装

需要 Docker Engine、Compose v2、bash。checkout 项目到 `~/svr/cms`，复制 `.env.example` 为 `.env` 并 `chmod 600 .env`：

| 变量                          | 设置                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| POSTGRES_DB / USER / PASSWORD | 生产数据库凭据                                                                  |
| DATABASE_URL                  | `postgresql://用户:URL编码后的密码@database:5432/数据库`；容器内主机为 database |
| JWT_SECRET                    | 使用 `openssl rand -hex 32` 生成                                                |
| ADMIN_EMAIL / PASSWORD / NAME | 唯一站长初始化；密码至少16字符                                                  |
| CMS_IMAGE                     | `ghcr.io/ahricool/cool-backend:sha-<完整 SHA>`                                  |
| CMS_FRONTEND_IMAGE            | `ghcr.io/ahricool/cool-frontend:sha-<相同 SHA>`                                 |
| CMS_ADMIN_IMAGE               | `ghcr.io/ahricool/cool-admin:sha-<相同 SHA>`                                    |
| HTTP_PORT                     | 默认8080；前置 HTTPS 网关时可设 `127.0.0.1:8080`                                |
| CORS_ORIGINS                  | 同源生产部署留空；需要跨源时填写完整 origin                                     |

Compose 内 MEDIA_ROOT 固定为 `/app/data/uploads`，映射持久化卷；宿主机 `.env` 中相对路径仅用于开发。

GHCR 镜像若私有，先 `docker login ghcr.io`（read:packages 权限）。Actions 内置 GITHUB_TOKEN 需要 packages 写权限，无需提交个人 Token。

```bash
./deploy.sh
docker compose -f docker-compose.prod.yml run --rm seed
curl --fail http://127.0.0.1:8080/api/v1/health
```

博客 `/`，后台 `/admin/`，API `/api/v1/`；只有 Nginx 映射宿主机端口。seed 幂等，不覆盖已有账号；完成初始化后可从服务器 `.env` 删除 ADMIN_PASSWORD。公网入口由现有网关终止 HTTPS，或自行给 Nginx 配置证书。

本地构建及部署（不拉取私有 registry）：

```bash
./scripts/build.sh
docker compose -f docker-compose.prod.yml up -d --wait database
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml run --rm seed
docker compose -f docker-compose.prod.yml up -d --wait backend frontend admin proxy
```

镜像名称由 `.env` 决定。可设置 `CMS_ENV_FILE=/绝对路径/配置文件` 使用其他环境文件。`deploy.sh` 执行拉镜像 → 数据库健康 → 备份 → migration → 三端健康 → Nginx。迁移失败即停止；不会隐式 git pull。默认每次部署备份，首次无数据时也可显式 `SKIP_BACKUP=1 ./deploy.sh`。

更新必须配套使用同一 SHA 的三端镜像与 checkout 中的 Compose/Nginx 配置。日常 SQL 迁移应兼容前一应用版本；破坏性迁移需要停机方案。回滚先检查 schema 兼容性，再切旧 SHA；更换镜像不会自动回滚数据库。

## 一致性备份

```bash
./backup.sh
```

备份短暂停止唯一写入者 backend（期间 API 不可用），导出 PostgreSQL custom format 和媒体卷，退出时恢复原本运行的 backend。每次成功得到：

```text
backups/cms-<UTC时间>-<进程号>/
  database.dump
  media.tar.gz
```

umask077 限制权限；失败只留下 `.partial`，不冒充成功备份。应定时执行并复制整个目录到另一台机器；当前不自动清理历史备份。备份目录不包含 `.env`，凭据与配置需单独保管。

## 恢复演练

先在隔离 Compose 项目演练。以下命令**覆盖目标数据库与媒体**，生产执行前先备份当前状态，并确认选择正确的备份目录：

```bash
export CMS_BACKUP_DIR=backups/cms-<UTC时间>-<进程号>
docker compose -f docker-compose.prod.yml stop proxy backend
docker compose -f docker-compose.prod.yml exec -T database \
  sh -c 'pg_restore --exit-on-error --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$CMS_BACKUP_DIR/database.dump"
docker compose -f docker-compose.prod.yml run --rm --no-deps -T --entrypoint sh backend \
  -c 'rm -rf /app/data/uploads && mkdir -p /app/data/uploads && tar -xzf - -C /app/data' \
  < "$CMS_BACKUP_DIR/media.tar.gz"
docker compose -f docker-compose.prod.yml up -d --wait backend frontend admin proxy
```

恢复时使用备份对应的应用版本，核对 `_prisma_migrations`，再验证登录、文章读取和图片下载。自定义环境文件时，所有手工 compose 命令都加 `--env-file "$CMS_ENV_FILE"`。

## 站长凭证维护

正常改密在后台“我的账户”完成，验证当前密码并注销所有会话。遗失密码时，由服务器维护者使用容器内 `dist/password.js` 的 hashPassword 生成哈希，再用 Prisma 更新唯一用户的 passwordHash，同时递增 authVersion。不要将明文写入 SQL、日志或命令历史；使用隐藏交互输入或受权限保护的临时文件。seed 不承担重置密码功能。

## 运维边界

- 健康接口检查数据库；三端均配置健康检查。日志：`docker compose -f docker-compose.prod.yml logs --tail=100 backend`。
- 后端和 Nuxt 以非 root 用户运行；PostgreSQL 无宿主机映射，媒体不会随容器重建丢失。
- 生产关闭 Swagger UI，保留 OpenAPI JSON。
- GitHub Actions 合入 main 后构建三镜像，不自动部署服务器。
- 单实例后端与本地文件卷适合个人站点；扩容前需共享对象存储和共享限流。
- 当前图片上传会转为 WebP，GIF仅保留首帧；页面引用媒体时不应直接手工删除卷中文件。
