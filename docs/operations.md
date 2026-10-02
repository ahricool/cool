# Linux 部署、备份与恢复

## 部署模型与配置

需要 Docker Engine、Compose v2、bash 和 Git。生产只有三个常驻服务：

- `frontend`：一个 Nginx 容器，提供统一 Nuxt 4 SPA（博客 `/`、后台 `/admin`），并代理 `/api/`
- `backend`：NestJS API，连接数据库与媒体卷，不映射宿主机端口
- `database`：PostgreSQL 17，不映射宿主机端口

`migrate`、`seed` 复用后端镜像，是一次性工具容器。前端通过 `nuxt generate` 生成 `apps/frontend/.output/public`；生产没有 Nuxt/Nitro 常驻进程，也没有独立管理端或代理镜像。

checkout 项目到 `~/svr/cms`，复制 `.env.example` 为 `.env` 并执行 `chmod 600 .env`。**生产必须将示例中面向宿主机的 DATABASE_URL 改为容器地址。**

| 变量                          | 设置                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| POSTGRES_DB / USER / PASSWORD | 生产数据库凭据                                                                         |
| DATABASE_URL                  | `postgresql://用户:URL编码后的密码@database:5432/数据库`；容器内主机为 `database`      |
| JWT_SECRET                    | 使用 `openssl rand -hex 32` 生成                                                       |
| HTTP_PORT                     | 默认 `8080`；前置 HTTPS 网关时建议绑定 `127.0.0.1:8080`                                |
| CORS_ORIGINS                  | TLS 终止在前置网关时设置公网完整 origin，例如 `https://blog.example.com`；多项逗号分隔 |

生产 Compose 固定 `NODE_ENV=production`、`PORT=3000`、`TRUST_PROXY_HOPS=1`、`MEDIA_ROOT=/app/data/uploads`，后者映射媒体卷。`.env.example` 的相对媒体路径和 `localhost:5433` 数据库地址用于宿主机本地开发。

`.env` 只保存运行环境与秘密，不放应用镜像版本或站长账户密码。唯一站长邮箱固定为 `whoreahri@gmail.com`，没有 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 配置。应用镜像版本在独立的 `deployment/` 清单中：

- `deployment/sha-<完整 SHA>.yml`：该版本两个应用镜像的 SHA 标签；migrate/seed 使用同一后端版本
- `deployment/current.yml`：最近成功部署的清单
- `deployment/previous.yml`：成功切换前的清单，用于排查与回滚参考

`./scripts/compose.sh <参数>` 统一加载 `docker-compose.prod.yml`、`${CMS_ENV_FILE:-.env}` 和 `deployment/current.yml`。`--images <路径>` 显式选择清单，`--images local` 使用基础 Compose 的 `cool-backend:local` / `cool-frontend:local`。尚无 current 清单时默认使用本地标签；显式指定不存在的其他清单会报错。环境文件和清单路径相对于项目根目录，也可传绝对路径。

GHCR 镜像若私有，先 `docker login ghcr.io`（read:packages 权限）。Actions 使用具有 packages 写权限的 GITHUB_TOKEN，无需提交个人 Token。

## 首次安装与版本更新

先取得 CI 已发布的完整 40 位 commit SHA，将 checkout 切换到该提交，并保持已跟踪文件无未提交修改。脚本不会隐式 git pull，也不接受短 SHA 或 `main` 作为部署参数。

```bash
# <完整 SHA> 必须与当前 clean checkout 及已发布镜像完全一致
./deploy.sh <完整 SHA>
./scripts/compose.sh ps
curl --fail http://127.0.0.1:8080/api/v1/health
```

部署依次执行：生成该 SHA 的版本清单 → 校验 Compose → 拉取后端/前端/数据库镜像 → 等待数据库健康 → 备份 → migration → 幂等 seed → 启动后端和前端并等待健康 → 保存 previous/current 清单。任一步失败即停止；失败候选清单保留供排查，current/previous 仍指向上次成功部署。脚本不会自动回滚已经运行的迁移或部分替换的容器，失败后应检查 `ps`、日志和实际镜像。

默认每次部署先备份；首次空库也支持备份。确实无需备份时可显式执行 `SKIP_BACKUP=1 ./deploy.sh <完整 SHA>`。已存在 current 清单时，部署前备份使用原版本镜像；首次安装使用新拉取的后端镜像创建空媒体卷。

访问 `/admin/login`：空库首次直接设置至少 16 字符的密码，不需要额外初始化密钥。**先完成首次密码设置，再开放新实例的公网访问。** 已有站长升级时邮箱规范为 `whoreahri@gmail.com`，密码、用户 ID 和内容保留；seed 不重置密码。升级后的第一次登录使用固定邮箱与原密码，旧版 Token 不再有效。

生产会话 Cookie 带 `Secure`，公开入口必须使用 HTTPS。前置网关负责 TLS 时，将精确的公网 HTTPS origin 填入 `CORS_ORIGINS`；参见下文代理说明。需要其他环境文件时，对所有构建、部署、备份和 Compose 操作统一设置：

```bash
export CMS_ENV_FILE=/绝对路径/cms-production.env
```

更新必须配套使用同一 SHA 的前后端镜像和该提交的 Compose/Nginx 配置。日常 SQL 迁移应兼容前一应用版本；破坏性迁移需要停机方案。回滚先检查 schema 兼容性，再 checkout 对应旧提交、检查其版本清单并重启；`previous.yml` 只记录应用镜像，不会回滚数据库或恢复旧配置。不要重新标记 SHA 镜像或将 `main` 标签用于生产定版。

## 本地构建与运行生产栈

仍使用上面的**容器版**运行环境文件；这与 README 中宿主机开发数据库配置不同。无需拉取应用 registry 镜像：

```bash
./scripts/build.sh
./scripts/compose.sh --images local up -d --wait database
./scripts/compose.sh --images local run --rm migrate
./scripts/compose.sh --images local run --rm seed
./scripts/compose.sh --images local up -d --wait --no-build --pull never backend frontend
curl --fail http://127.0.0.1:8080/api/v1/health
```

`build.sh` 默认始终构建本地标签，不采用 current 发布版本清单。后续查看日志、停机、备份等操作也使用 `--images local`，避免选中此前的发布清单。首次构建仍需要下载基础镜像和 npm 依赖。`build.sh --images <清单路径>` 用于隔离验收等需要自定义镜像名的构建；不要用它覆盖已发布的 SHA 标签。

```bash
./scripts/compose.sh --images local logs --tail=100 backend
./backup.sh --images local
```

## 代理信任与访客限流

后端默认 `TRUST_PROXY_HOPS=0`，使用直接连接的 IP，忽略客户端自填的转发头。生产 Compose 固定为 `1`，仅信任紧邻后端的一跳代理；frontend 内的 Nginx 在登录、首次设置和所有 API 路由中用 `$remote_addr` **覆盖** `X-Forwarded-For`，并覆盖 `X-Forwarded-Host` / `X-Forwarded-Proto`。这样访客分别计入后端限流额度，伪造的转发链不会改变额度归属。不要改成无限信任或使用 `$proxy_add_x_forwarded_for` 传递未经验证的客户端头。

此配置的信任边界是私有 Compose 网络：后端不得映射公网端口，也不得让不可信容器或其他客户端直接连接后端；数字跳数不会校验代理身份。自定义直连部署保持 `0`；只有能保证请求必经受控、覆盖转发头的唯一入口时才设为 `1`。配置只接受 `0` 或 `1`，错误值会阻止后端启动。

当前 Nginx 向后端发送它自身的 `$scheme`。当 HTTPS 终止在前置网关、网关与 Nginx 之间使用 HTTP 时，后端看到的协议仍是 HTTP。因此即使浏览器与 API 同域，`CORS_ORIGINS` 也须包含精确的公网 HTTPS origin，供登录、首次设置与 Cookie 写请求的来源校验使用；留空会拒绝这些浏览器请求。不要为解决此问题直接信任任意客户端传来的协议头。

如果 Nginx 前还有 HTTPS 网关、CDN 或负载均衡器，默认 `$remote_addr` 是该上游地址，同一上游下的访客仍会共享 Nginx 和后端限流。上线前按实际拓扑配置 Nginx 的 Real IP 模块：`set_real_ip_from` 只列出受信上游的准确 IP/CIDR，由这些上游覆盖访客地址头，再配置相应的 `real_ip_header`（多层代理还需审核 `real_ip_recursive`）。同时限制入口只能被指定上游访问；不得使用 `0.0.0.0/0` 或 `::/0` 信任任意来源。后端仍保持一跳信任，并由 Nginx 继续输出已验证的单一访客地址。部署验证应确认两个实际客户端各自有独立额度，且更换伪造的 `X-Forwarded-For` 不会重置额度。

## 一致性备份与版本记录

```bash
./backup.sh
# 本地构建栈用 ./backup.sh --images local
# 指定其他版本用 ./backup.sh --images /绝对路径/release.yml
```

备份短暂停止唯一写入者 backend（期间 API 不可用），导出 PostgreSQL custom format 和媒体卷，退出时恢复原本运行的 backend。每次成功得到：

```text
backups/cms-<UTC时间>-<进程号>/
  database.dump
  media.tar.gz
```

umask 077 限制权限；失败留下 `.partial`，不冒充成功备份。检查脚本退出状态和恢复后的健康状态。应定时执行并复制整个备份目录到另一台机器；当前不自动清理历史备份。

备份脚本只保存数据库与媒体，**不自动保存应用清单、checkout 或 `.env`**。为每份可恢复的发布备份，另存备份时实际运行的版本清单及其完整 commit SHA；使用该版本的 Git checkout 保留部署配置。独立保管运行环境与秘密，不将它们提交 Git。以下操作应在同一版本稳定运行、没有并发部署时完成：

```bash
# 替换为 backup.sh 刚输出的成功目录
export CMS_BACKUP_DIR="$PWD/backups/cms-<UTC时间>-<进程号>"
cp deployment/current.yml "$CMS_BACKUP_DIR/release.yml"
# 记录 release.yml 中 sha- 标签的完整 SHA，与该版本 checkout 一起保管
chmod 600 "$CMS_BACKUP_DIR/release.yml"
```

部署脚本生成的升级前备份对应**旧版 current**，不是即将部署的候选 SHA。成功更新后可用 `deployment/previous.yml` 找到紧邻这次更新前的版本，但后续部署会覆盖 previous，应及时将版本记录与对应备份一起归档。本地标签不标识不可变版本；本地恢复演练应使用同一次构建的镜像，长期备份则保留可重新取得的固定镜像及源码版本。

## 隔离恢复演练

先在备份对应的完整 SHA checkout 中准备环境文件和 `release.yml`，不要先执行迁移。以下命令**覆盖目标数据库与媒体**；生产恢复前先备份当前状态。演练必须选择全新的 Compose 项目名，以使用独立数据库/媒体卷，不能复用线上项目名。

```bash
export CMS_BACKUP_DIR=/绝对路径/backups/cms-<UTC时间>-<进程号>
export CMS_ENV_FILE=/绝对路径/cms-restore.env
# 此环境文件 DATABASE_URL 指向 database:5432，并使用目标数据库凭据
export COMPOSE_PROJECT_NAME=cms-restore-drill
export HTTP_PORT=127.0.0.1:18080

restore_compose() {
  ./scripts/compose.sh --images "$CMS_BACKUP_DIR/release.yml" "$@"
}
restore_compose config --quiet
restore_compose pull database backend frontend
restore_compose up -d --wait database
restore_compose stop frontend backend
restore_compose exec -T database \
  sh -c 'pg_restore --exit-on-error --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$CMS_BACKUP_DIR/database.dump"
restore_compose run --rm --no-deps -T --entrypoint sh backend \
  -c 'rm -rf /app/data/uploads && mkdir -p /app/data/uploads && tar -xzf - -C /app/data' \
  < "$CMS_BACKUP_DIR/media.tar.gz"
restore_compose up -d --wait --no-build --pull never backend frontend
curl --fail http://127.0.0.1:18080/api/v1/health
```

核对 `_prisma_migrations`、站长/文章/媒体 ID、Markdown 内容与图片字节，验证固定邮箱加备份时的密码能登录。通过 HTTPS 入口验证 Cookie 登录、刷新恢复和编辑；命令行可使用 Bearer Token 验证 API。恢复同版本数据无需重新 seed；若要升级，先确认恢复成功，再按正常升级流程执行新版本 migration。恢复数据库也恢复当时的会话状态，需要强制重新登录时在后台撤销全部会话。

恢复验证完成后再决定是否清理演练卷。不要将演练的 COMPOSE_PROJECT_NAME、HTTP_PORT、CMS_ENV_FILE 带入后续生产命令。生产恢复同样使用明确的版本清单，不能让恢复步骤意外回退到本地默认标签。

## 站长凭证与会话维护

正常改密在后台“我的账户”完成，验证当前密码并注销全部会话；也可单独撤销全部会话。登录返回 Bearer Token，同时设置 15 天 HttpOnly Cookie，二者绑定可撤销的服务器端会话。浏览器刷新后恢复 Cookie 会话，Cookie 认证的写请求须带 `X-CSRF-Token`，统一前端自动处理。

遗失密码时，由服务器维护者使用容器内 `apps/backend/dist/password.js` 的 `hashPassword` 生成哈希，再用 Prisma 更新唯一用户的 `passwordHash`，同时递增 `authVersion` 并撤销其 `admin_sessions`。不要将明文写入 SQL、日志或命令历史；使用隐藏交互输入或受权限保护的临时文件。seed 不承担重置密码功能，也不要删除站长来重新初始化。

## CI 与运维边界

- `verify` 执行类型检查、静态生成、lint、格式、审计、真实数据库/API/迁移测试、真实 Nginx 边界测试和浏览器测试
- `compose-smoke` 运行 `scripts/compose-smoke.sh`，构建当前代码的两个应用镜像，验证空库备份、迁移、seed 幂等、首次密码设置、静态路由/资源、内容发布、上传、改密，并通过生产 Nginx 运行完整 Playwright 浏览器流程和桌面/移动截图，再验证有内容备份；移除源项目和源卷后，在另一项目恢复并比对迁移、ID、Markdown 与媒体 SHA-256
- `images` 等待以上两个任务成功，再构建两个应用镜像；PR 不推送，合入 main 后推送 GHCR 的 main 与完整 SHA 标签，不自动部署服务器
- 可在具备 Docker 的 Linux 环境先运行 `npm ci`、`npx playwright install --with-deps chromium`，再运行 `bash scripts/compose-smoke.sh`。它只使用隔离项目，清理自身测试容器/卷，保留受限长度且已脱敏的报告与日志，不上传秘密、数据库 dump 或媒体备份
- 三个常驻服务均有健康检查；API 健康接口检查数据库，frontend 检查静态入口。日志：`./scripts/compose.sh logs --tail=100 backend frontend`
- 后端以非 root 用户运行；前端使用 Nginx 官方运行镜像。PostgreSQL 无宿主机映射，媒体不会随容器重建丢失
- 生产关闭 Swagger UI，保留 OpenAPI JSON；Nginx 对深层页面回退到 SPA，但缺失的 `/_nuxt/` 与 `/sakura/` 资源返回 404
- 单实例后端与本地文件卷适合个人站点；扩容前需共享对象存储和共享限流
- 当前图片上传会转为 WebP，GIF 仅保留首帧；页面引用媒体时不应直接手工删除卷中文件
