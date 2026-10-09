# 完整前端主题系统

一个 Nuxt 4 / Vue 3 / TypeScript 应用，Sakura 与 Ury 两个构建时注册的独立公共前端，共享现有 NestJS API。`ssr: false`、Docker 与静态部署结构不变。主题选择替换完整 Vue 组件树，与 light/dark 分开；不再使用主题调色板覆盖。

## 目录与边界

```text
app/
  pages/                     # 原有公共 URL 的 ThemePage 分发 + 原有 Admin 路由
  layouts/default.vue        # 当前主题入口分发
  layouts/admin.vue          # 固定 Admin 布局
  error.vue                  # 独立 Nuxt 错误根的主题 / Admin 分发
  components/ThemePage.vue
  composables/               # API、语言、状态、内容请求、404 等非视觉能力
  stores/site.ts
  themes/
    types.ts                 # SiteTheme、PublicPage、静态 loader 契约
    registry.ts              # 唯一注册表：ID、目录、入口、页面、错误、模式、资源
    components.ts            # 稳定的异步组件缓存
    sakura/
      Entry.vue
      pages/                 # Home/Post/Page/Search/About/Tags/Error
      layouts/Shell.vue
      components/            # 原有 Sakura 页面组件、文章卡片、导航、Footer、图案
      styles/                # index/tokens/navigation/base/shell/content/actions/feedback
      assets/                # SVG 字标、图标数据
      composables/           # 原阅读栏与 banner 同步
      utils/                 # 阅读 shell 注入、图案生成
    ury/
      Entry.vue
      pages/                 # 同一公共页面契约，完全独立的模板
      layouts/Shell.vue
      components/            # 独立 ArticleCard、ApiState、Pagination
      styles/index.css
      assets/mark.svg
  features/admin/            # 原有业务页面、上传与设置；不放进主题目录
    visuals/                 # 保留 Admin 的固定品牌、图案和明暗按钮
    assets/                  # Admin 固定字标
    utils/                   # Admin 固定图案工具
    Error.vue
  assets/admin/              # 独立固定样式与原有配色
public/
  sakura/                    # Sakura 现有资源 URL 保持兼容
  themes/ury/mark.svg    # Ury 独立 favicon
  fonts/                     # 既有可选用户字体
```

Sakura 原页面主要是移动并补上显式本地组件 import，没有重新设计。Admin 原本共用的少量品牌/图案视觉原语保留一份固定实现，避免它加载任何公共主题的 Vue 或 CSS；Admin 业务组件和页面只有原来一份。两者不通过全局组件名耦合。Ury 不导入 Sakura 或 Admin 的组件、样式、token、字体或图片。

## 注册与页面分发

`Admin 草稿 → 保存 PUT /admin/settings → JSONB site.appearance.themeId → GET /public/site → site store → 主题入口 + 对应页面组件`

注册表使用 `satisfies SiteTheme` 保证每套主题实现完整页面表，动态 import 路径均为源码中的字面量。`ThemePage` 接受 `PublicPage`，从当前主题解析异步 Vue 页面；默认 layout 分发主题 `Entry.vue`，入口拥有自己的布局、样式及静态资源。缓存保存组件定义，不保存页面实例；切换 ID 会卸载旧入口和页面树，同一 URL 保持可访问。首次配置读取完成或明确失败后才挂载公共主题，避免 Ury 首屏加载 Sakura 的资源。`initialized` 此后保持为 true；`loaded` 表示已有有效数据，`loading` 仅表示当前刷新。语言刷新保留现有入口与数据，仅主题 ID 改变时替换入口。

| 原有 URL                         | 页面键            | 共享数据契约                                    |
| -------------------------------- | ----------------- | ----------------------------------------------- |
| `/`                              | `home`            | `/public/timeline`，包含文章和瞬间，cursor 分页 |
| `/posts/:slug`                   | `post`            | `/public/posts/:slug`                           |
| `/pages/:slug`                   | `page`            | `/public/pages/:slug`                           |
| `/about`                         | `about`           | `/public/about`                                 |
| `/search?q=&page=`               | `search`          | `/public/search`                                |
| `/tags`、`/tags/:slug?page=`     | `tags`            | `/public/tags`、`/public/tags/:slug/posts`      |
| 不存在的路径、内容 404、全局错误 | 独立 `error` 入口 | Nuxt error 根，恢复时重新挂载当前主题           |

不复制 Nuxt 路由，不添加隐藏业务入口。后续完整主题只实现这些页面，不需要修改公共路由。新增全站业务 URL 才需要增加一份公共路由和对应页面契约；本次没有主题特有路由或插件机制。

`usePublicDocument` / `usePublicNotFound` 只加载内容和处理 HTTP 404；请求 thenable 在组件作用域内同步注册 watcher，再由页面 await，卸载页面不会保留旧 404 监听。网络/其他 API 错误保留主题自己的重试 UI。`useTimeline`、API client、数据类型、Markdown/媒体解析、语言/日期及公共状态可共享；文章卡片、正文 DOM、导航、布局和视觉反馈由主题拥有。

## CSS、资源与 SPA 隔离

`nuxt.config.ts` 不再全局加载 Sakura 或 Admin CSS。各主题入口与错误入口导入自己的样式，Admin 进入时加载固定 CSS。`build/surface-styles.ts` 从注册表的 `directory` 自动确定样式归属：

- Sakura 的每个选择器都受零 specificity 的 `:where(html[data-surface='blog'][data-site-theme='default'])` 边界约束；Ury 使用自己的 ID。所有主题目录内的 CSS 和 Vue 样式都适用。
- `html`、`:root`、根 `.dark` 和伪元素约束在原复合选择器上；普通选择器加根祖先约束。媒体查询内规则也隔离。
- Admin、Element Plus 与 Teleport 到 body 的菜单、弹窗和 Toast 受 `data-surface='admin'` 约束。命令式 Toast/确认框放在 Admin 专用容器；离开后台或挂载 Nuxt 错误根时取消 pending 确认、立即 detach 容器并恢复 body 的滚动锁/宽度。导航代号防止被取消的异步安装重新激活反馈。
- 引入的第三方高亮样式继承导入入口的边界；keyframes 与 animation 引用增加主题/表面命名空间。
- Vue scoped CSS 仍可使用。SPA 已载入的样式可留在 document，但在其他主题/Admin 上不匹配；不靠覆盖、不靠移除 link 标签。双向 SPA 测试检查真实 DOM、计算样式与非活动主题变量。
- 字体面使用不同的主题专属 family 名，资源放在主题 `assets/` 或 `public/themes/<id>/`。图片/字体仅在对应组件/CSS 使用时加载。Sakura 既有 `/sakura/` 路径保留，用户上传素材仍使用 API 媒体 URL。

## 配置与兼容

`default` 稳定映射 Sakura；`ury` 为第二套完整主题，`sakura` 是 `default` 的可读别名。已移除的 `minimal`、旧 `soft-preview`、未知/删除/损坏 ID 安全回退 Sakura，不写数据库。Admin 显式保存时保存当前有效选择。后端仍只验证 ID 格式，原 API 路径、DTO 省略字段兼容、内容模型、JSONB 与数据库结构均保留；没有 migration。

选择仅修改 Admin 表单草稿，保存成功并重新读取公共配置后生效；PUT 成功但读取失败时提示“配置已保存，但当前页面更新失败”，重试仅重新 GET，不重放 PUT。`store.load()` 返回最新有效请求是否已应用的 boolean；旧调用方可以继续忽略结果。其他浏览器标签页刷新/重新读取后生效，不增加实时广播。主题代码在构建时注册，切换已注册主题不用重新部署或重启；添加新的主题源码需要正常构建发布。

| 配置                             | 行为                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| light/dark                       | Sakura 使用 `cool_theme`，Ury 使用独立 `cool_ury_palette`（light/sepia/dark），Admin 使用 `cool_admin_theme`；Admin 第一次从旧 cookie 继承原偏好，之后独立。`colorModes` 声明主题支持的模式；`usePublicColorMode` 提供实际 `dark` 与 `canToggle`，单配色不显示切换按钮，也不改写原偏好。 |
| font/fontSize                    | 原数据保留。根提供 `data-font` 和可选 `--site-font-scale`；主题选择是否使用，无强制视觉 token。Sakura/Admin 保持原字体及 80–150%字号；Ury 只读取嵌套 `appearance.ury` 的 serif/sans 字体及 80–150% 字号，不读取 Sakura 字段。                                                            |
| avatar/cover/background 图案     | 数据保留，Sakura/Admin 沿用原效果；Ury 使用自己的默认标识与无图案背景；showAvatar/showCovers 独立控制内容头像和封面。                                                                                                                                                                    |
| 首页背景/账户头像/文章和媒体图片 | 原值保留。Sakura 原行为；Ury 展示内容、封面和账户上传图片，首页采用文字介绍，不继承 Sakura hero 背景或动画。                                                                                                                                                                             |
| 语言                             | 保留 `cool_locale`、zh/en UI、内容译文及后端回退，无语言 URL。                                                                                                                                                                                                                           |

Sakura 保留导航、搜索、关于我、Footer、文章列表/详情、时间线瞬间、明暗、响应式、品牌/图案、字号、双语与媒体展示。Ury 使用阅读侧栏、衬线正文、独立留白与内嵌目录，提供 light/sepia/dark、serif/sans、80–150% 字号、comfortable/wide 阅读宽度及头像/封面开关。首页支持自动加载和手动重试，不继承 Sakura hero。

## 新增完整主题

1. 创建 `app/themes/wordpress/`，自行编写 `Entry.vue`、布局、组件、所有页面、错误入口、样式和资源。无需继承其他主题。
2. 入口和错误组件各自导入本主题样式；本地视觉组件显式 import，不用全局同名自动注册。样式放在该目录，字体 family 名使用自己的前缀；使用 `html`/`:root` 写根规则，所有 owned 选择器会自动限制作用域。
3. 在注册表增加一个满足 `SiteTheme` 的静态对象，例如 `id: 'wordpress'`、`directory: 'wordpress'`、`entry: () => import('./wordpress/Entry.vue')`、`error: () => import('./wordpress/pages/Error.vue')`；为 `home/post/page/search/about/tags` 分别声明字面量 loader。声明 label/description、colorModes、独立 icon 和可选 touchIcon，以及本主题 `appearance.ts` 中的 `ThemeAppearanceDefinition`（readerCookie 与纯 resolve 函数）。
4. 通过共享 API/composables 取得数据；自行渲染 DOM，不需要修改 Sakura、Admin、后端或公共路由。需要 English 的选择说明时添加翻译文案。
5. 用合成数据验证全部 URL、保存/刷新、两个方向的同 document 切换、404/错误、语言、字体/字号、手机/桌面及资源隔离。移除主题只移出注册表，历史 ID 自动回退。

不使用任意路径 import、第三方运行时代码、主题上传/安装器、主题商店或数据库 HTML/JS/CSS。

## 验证流程与记录

```bash
npm ci
npm run db:generate                 # 只生成本地客户端，不连接数据库
npm run build
npm run typecheck
npm run lint
node --import tsx --test tests/unit/site-themes.test.ts tests/unit/blog-layout.test.ts apps/frontend/build/surface-styles.test.ts
node --test apps/backend/test/settings-theme.test.cjs
npm run test:content
npm run test:themes
```

浏览器测试只启动独立 loopback 静态 SPA，通过 Playwright 拦截全部 API，在内存中保存合成配置，不启动后端或连接数据库。后端配置测试使用真实 ValidationPipe/controller 与内存数据库替身。完整 HTTP/PostgreSQL E2E 不属于这些合成检查。

视觉比较基线不提交到 Git。先构建待比较的旧版本并运行 `THEME_CAPTURE_BASELINE=1 npx playwright test --config playwright.theme.config.ts tests/theme/visual-compat.spec.ts --update-snapshots`；保留 `artifacts/theme-baseline/`，再构建新版本运行同一 spec。不含基线的干净 checkout 明确跳过截图比较，功能浏览器测试仍运行。`npm run test:themes` 的退出码 0 可以包含跳过项，不能据此声称视觉验收通过。配置中的 `visual-reporter.ts` 额外报告 passed / failed-or-blocked / skipped / unexecuted / baseline captures，缺基线、未选截图用例、未执行或生成/更新基线均不会算作已通过截图比较。`THEME_STATIC_ROOT` 可指定另一个隔离构建的 static public 目录。测试固定随机 seed、同一合成数据与字体，等待图片加载并关闭动画，允许像素差异为 0。

实际执行结果与限制以对应 PR 的检查报告为准，历史 PR 的通过结论不代表当前版本通过。SSR 本次未开启、未进行 SSR 验证；入口/loader 和请求沿用 Nuxt API，视觉浏览器逻辑在挂载生命周期或用户事件执行。未来开启 SSR 时仍需审计既有全局 locale 状态并补充服务端隔离测试。

## 移除 Minimal：兼容与验证边界

- 注册表、Admin 主题选项、完整组件树、CSS、图标与专属选择文案仅保留 Sakura 和 Ury；没有改动这两套主题的视觉实现、独立配置或共享 API。
- 保存过的 `themeId: minimal` 在公共入口、错误入口和 Admin 草稿中均通过同一个 resolver 回退到 Sakura。读取/刷新不会自动保存、迁移或重写数据库；只有用户显式保存 Admin 配置时才保存有效选择。原有 Sakura 字体/字号/图案、Ury 嵌套配置、首页和上传资源均保留。
- 后端 DTO 继续验证安全 ID 格式，不收紧成当前前端主题枚举。旧客户端可以提交/回传 `minimal`，或省略 themeId/appearance/ury；API 保留这些已存数据，新前端仍安全回退。测试使用真实 ValidationPipe/controller 和内存数据库验证退休 ID 往返、读取零写入、省略字段及两个配置的保留；无 schema/API 路径变更，无数据库 migration。
- 原测试架构保留：CSS 根规则/keyframes 隔离改测 Sakura/Ury；公共路由、语言、响应式、错误恢复、延迟请求、Admin Teleport/滚动锁、SPA 双向切换和未保存草稿继续覆盖两个现役主题。Ury 延迟请求测试切换到 Sakura；首载资源隔离和旧 Admin 视觉基线用例改测 Ury。历史 ID 回退用例额外检查只有两个主题选项、无隐式写入及显式保存时的配置保留。
- 单元、构建、类型与 DTO 检查不能代替浏览器验收。本轮不再次启动此前被云环境拒绝的 Chromium（socket EPERM），不绕过限制、不连接用户电脑。Playwright 发现/静态检查不计为用例执行；浏览器、截图、真实 PostgreSQL/HTTP 集成与部署均未验证。旧截图基线不提交、不自动更新；PR 保持 draft，不能据此声称可合并。
