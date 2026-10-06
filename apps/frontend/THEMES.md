# 网站主题架构

## 初步范围

公共页、Admin、登录、错误页和传送弹层继续共用一个 Nuxt 应用及现有组件。主题是本地声明式视觉配置，不复制路由、页面或业务逻辑。本阶段仅提供默认主题与「柔灰（预览）」两个选择，后者只调整灰色表面及克制阴影，保留樱粉点缀；后续再优化视觉细节。

默认主题的 light/dark 覆盖均为空，直接使用现有 `assets/tokens.css`。该文件原值、CSS 优先级、组件尺寸、图案、图片和品牌资源均保持原样，避免提取默认主题时改变实际视觉。

## 数据与应用路径

`Admin 外观表单 → PUT /admin/settings → site_settings.site.appearance.themeId → GET /public/site → site store → app.vue 根变量 → 现有组件`

- `site.appearance.themeId` 是站长保存的全站主题标识，初始为 `default`。复用现有 JSONB 配置与保存按钮，不新增表或 SQL migration。
- 后端只校验标识格式（以小写字母开头的小写字母、数字、连字符，最多 48 字符），不导入前端注册表。旧客户端省略标识时保留当前值；旧数据缺字段时读取补上 `default`，不批量重写数据。
- `app/themes/registry.ts` 是可用主题的唯一前端注册表，包含标识、双语文案键、预览状态和 light/dark 语义 token 覆盖。所有 CSS 值来自仓库代码，数据库内容不会直接成为 CSS。
- `resolveSiteTheme` 在 store、表单和根应用层统一解析，未知、删除或损坏的标识安全回退默认。读取回退不写数据库；在外观表单显式保存时会保存当前显示的有效选择。
- `app.vue` 输出独立 `data-site-theme`，按当前明暗选择整套根变量覆盖。每次替换完整覆盖字符串，切回默认、切换明暗或 SPA 切换路由不会残留上个主题的变量。
- Element Plus 已由 `assets/admin/theme.css` 映射到相同语义变量；不新增 Admin 专属主题、侧栏或主题切换入口。
- 表单选择仅修改草稿，保存成功并重新读取公共配置后应用。其他标签页在刷新/重新读取配置时生效，本阶段不增加广播、实时预览或自动保存。

## 独立边界

| 配置                              | 来源                                      | 主题切换行为                           |
| --------------------------------- | ----------------------------------------- | -------------------------------------- |
| 全站主题                          | `site.appearance.themeId`                 | 仅改变该标识                           |
| 浅色/深色                         | 读者 `cool_theme` cookie                  | 保留选择；决定该主题的 light/dark 覆盖 |
| 字体/字号                         | `site.appearance.font/fontSize`           | 原样保留，不属于主题 token             |
| 背景/缺省头像/相册封面图案        | `site.appearance.background/avatar/cover` | 原样保留；八色与生成器不变             |
| 首页图片、账户头像、内容/相册图片 | 现有独立字段与资源                        | 原样保留，不注入主题图片               |
| 语言                              | `cool_locale` cookie 与内容译文           | 默认中文、显式 English、无语言 URL     |

主题 token 的类型白名单只允许视觉颜色、语义表面及阴影；字体、字号、图案透明度、导航结构、尺寸和媒体 URL 不可覆盖。仍遵守 [DESIGN.md](DESIGN.md)：粉灰白黑、按钮无硬边框、克制阴影、可见焦点、只有 Footer 樱花旋转、Admin Logo 菜单与账户菜单。不得以主题之名恢复已移除功能。

## 扩展新主题

1. 在 `registry.ts` 添加一个稳定、唯一、符合格式的标识；不要更改 `default` 的空覆盖或旧标识含义。
2. 添加 label/description 及 `i18n/admin-settings.ts` 的 English 文案；未完成视觉验收的主题明确标为预览。
3. 分别声明 light/dark token，省略的 token 继承该明暗模式的默认值。主色变更需成组检查 accent、主按钮、hover/active/disabled、前景色及状态色可读性。
4. 复用现有组件与 Element Plus 映射。若确实需要新的共享视觉 token，先以原 CSS 值替换有限的声明，保持默认截图，再将其加入类型白名单；不要整体重构页面。
5. 验证保存/刷新、未知标识回退、切回默认无残留、两种明暗与字体/字号/图案/自定义图片组合。检查桌面/窄屏、焦点、菜单、弹窗与正文。

移除主题只需移出注册表；旧数据库标识会回退默认，不需要删除或覆盖其他设置。本阶段没有主题商店、远程 CSS、可执行上传、第三方插件、任意布局模板或用户自定义 CSS。

## 隔离验证

`npm run test:themes` 使用已构建的静态前端、专用 loopback 端口及浏览器拦截的合成 API 数据；不启动后端、不连接数据库，也不复用现有业务服务。设置的读写在测试内存中完成。后端配置的 DTO 校验、旧值保留和持久化往返另由 `apps/backend/test/settings-theme.test.cjs` 的内存数据库替身验证。这些检查不等同于真实 PostgreSQL 或生产 UI 验收。

```bash
npm run build -w @cool/frontend
npm run test:themes
# 生成 Prisma 客户端并编译后端后，单独运行配置测试，不连接数据库。
node --test apps/backend/test/settings-theme.test.cjs
```

### 2026-10-06 验证记录

基线是最新 main `7501d14730ced16995634db870f0f83ee65325a1`（PR38 已合入）。本次使用独立 clone/分支、本地静态构建、Chromium headless 和合成数据，未启动/访问 FA 容器、数据库、日志或服务。

- 前后端构建、前端 typecheck、全仓 lint、变更文件格式检查与 `git diff --check` 通过。
- 23 项主题/样式作用域/Admin API 单测、3 项后端配置往返与实际 DTO 校验、4 项 Markdown/媒体内容测试通过。
- 3 项合成浏览器测试通过：旧/未知标识回退、保存/刷新/切回默认、主题与明暗/两种字体/80%和150%字号/图案和无图案/自定义图片/显式 English 组合。包含键盘选择与焦点、390px 窄屏主题选择。
- 默认主题逐像素比较：同数据、固定图案 seed、关闭动画并等待字体/图片；首页、搜索、Admin 基本配置 × 1440/390px × light/dark，共 12 组，像素差异全部为 0。外观页新增选择控件不属于不变区域；另检查了实际桌面和手机预览主题截图。
- 全量 `test:unit` 结果为 77 通过、13 失败。失败集中于未改动的备份/部署/媒体 smoke 脚本：macOS 的 `mktemp` 不支持 GNU `--suffix=.partial`，以及 `/var` 为符号链接触发路径检查；未扩展到运维兼容修复。
- 全量 `format:check` 被原有 `app/components/ArticleCard.vue` 与 `tests/e2e/album-busy.spec.ts` 格式问题阻挡；这两个文件未修改，变更文件全部通过。

未验证：真实 PostgreSQL 与后端 HTTP 集成、生产/真实账户数据、完整 PR38 的媒体/上传忙碌回归、所有路由/浏览器/触摸设备。上述截图与测试不能替代这些验收；无合并或部署。
