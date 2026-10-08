# 完整前端主题系统

一个 Nuxt 4 / Vue 3 / TypeScript 应用，多个构建时注册的独立公共前端，共享现有 NestJS API。`ssr: false`、Docker 与静态部署结构不变。主题选择替换完整 Vue 组件树，与 light/dark 分开；不再使用主题调色板覆盖。

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
    minimal/
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
  themes/minimal/mark.svg    # Minimal 独立 favicon
  fonts/                     # 既有可选用户字体
```

Sakura 原页面主要是移动并补上显式本地组件 import，没有重新设计。Admin 原本共用的少量品牌/图案视觉原语保留一份固定实现，避免它加载任何公共主题的 Vue 或 CSS；Admin 业务组件和页面只有原来一份。两者不通过全局组件名耦合。Minimal 不导入 Sakura 或 Admin 的组件、样式、token、字体或图片。

## 注册与页面分发

`Admin 草稿 → 保存 PUT /admin/settings → JSONB site.appearance.themeId → GET /public/site → site store → 主题入口 + 对应页面组件`

注册表使用 `satisfies SiteTheme` 保证每套主题实现完整页面表，动态 import 路径均为源码中的字面量。`ThemePage` 接受 `PublicPage`，从当前主题解析异步 Vue 页面；默认 layout 分发主题 `Entry.vue`，入口拥有自己的布局、样式及静态资源。缓存保存组件定义，不保存页面实例；切换 ID 会卸载旧入口和页面树，同一 URL 保持可访问。首次配置读取完成或明确失败后才挂载公共主题，避免 Minimal 首屏加载 Sakura 的资源。`initialized` 此后保持为 true；`loaded` 表示已有有效数据，`loading` 仅表示当前刷新。语言刷新保留现有入口与数据，仅主题 ID 改变时替换入口。

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

- Sakura 的每个选择器都受零 specificity 的 `:where(html[data-surface='blog'][data-site-theme='default'])` 边界约束；Minimal 使用自己的 ID。所有主题目录内的 CSS 和 Vue 样式都适用。
- `html`、`:root`、根 `.dark` 和伪元素约束在原复合选择器上；普通选择器加根祖先约束。媒体查询内规则也隔离。
- Admin、Element Plus 与 Teleport 到 body 的菜单、弹窗和 Toast 受 `data-surface='admin'` 约束。命令式 Toast/确认框放在 Admin 专用容器；离开后台或挂载 Nuxt 错误根时取消 pending 确认、立即 detach 容器并恢复 body 的滚动锁/宽度。导航代号防止被取消的异步安装重新激活反馈。
- 引入的第三方高亮样式继承导入入口的边界；keyframes 与 animation 引用增加主题/表面命名空间。
- Vue scoped CSS 仍可使用。SPA 已载入的样式可留在 document，但在其他主题/Admin 上不匹配；不靠覆盖、不靠移除 link 标签。双向 SPA 测试检查真实 DOM、计算样式与非活动主题变量。
- 字体面使用不同的主题专属 family 名，资源放在主题 `assets/` 或 `public/themes/<id>/`。图片/字体仅在对应组件/CSS 使用时加载。Sakura 既有 `/sakura/` 路径保留，用户上传素材仍使用 API 媒体 URL。

## 配置与兼容

`default` 稳定映射 Sakura；`minimal` 为第二套完整主题。旧 `soft-preview`、未知/删除/损坏 ID 安全回退 Sakura，不写数据库。Admin 显式保存时保存当前有效选择。后端仍只验证 ID 格式，原 API 路径、DTO 省略字段兼容、内容模型、JSONB 与数据库结构均保留；没有 migration。

选择仅修改 Admin 表单草稿，保存成功并重新读取公共配置后生效；PUT 成功但读取失败时提示“配置已保存，但当前页面更新失败”，重试仅重新 GET，不重放 PUT。`store.load()` 返回最新有效请求是否已应用的 boolean；旧调用方可以继续忽略结果。其他浏览器标签页刷新/重新读取后生效，不增加实时广播。主题代码在构建时注册，切换已注册主题不用重新部署或重启；添加新的主题源码需要正常构建发布。

| 配置                             | 行为                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| light/dark                       | 公共 `cool_theme` 与 Admin `cool_admin_theme` 分开；Admin 第一次从旧 cookie 继承原偏好，之后独立。`colorModes` 声明主题支持的模式；`usePublicColorMode` 提供实际 `dark` 与 `canToggle`，单配色不显示切换按钮，也不改写原偏好。 |
| font/fontSize                    | 原数据保留。根提供 `data-font` 和可选 `--site-font-scale`；主题选择是否使用，无强制视觉 token。Sakura/Admin 保持原字体及 80–150%字号；Minimal 固定使用自己的 system 字体与 100% 字号，不读取 Sakura 字段。                     |
| avatar/cover/background 图案     | 数据保留，Sakura/Admin 沿用原效果；Minimal 使用自己的默认标识与无图案背景。                                                                                                                                                    |
| 首页背景/账户头像/文章和媒体图片 | 原值保留。Sakura 原行为；Minimal 展示内容、封面和账户上传图片，首页采用文字介绍，不继承 Sakura hero 背景或动画。                                                                                                               |
| 语言                             | 保留 `cool_locale`、zh/en UI、内容译文及后端回退，无语言 URL。                                                                                                                                                                 |

Sakura 保留导航、搜索、关于我、Footer、文章列表/详情、时间线瞬间、明暗、响应式、品牌/图案、字号、双语与媒体展示。Minimal 使用水平可换行文本导航、无 hero 图片的介绍、横排文字/缩略图卡片、单栏正文和内嵌目录；这是一套功能完整的简单演示主题，不是 Sakura 改颜色。

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

2026-10-08 的实际结果与限制见本次 PR 描述。SSR 本次未开启、未进行 SSR 验证；入口/loader 和请求沿用 Nuxt API，视觉浏览器逻辑在挂载生命周期或用户事件执行。未来开启 SSR 时仍需审计既有全局 locale 状态并补充服务端隔离测试。

### 2026-10-08 实际验证结果

隔离 clone 在 PR 原分支上从 `2164bb3bc92ca43f9ec75fe0de074af1de2232b1` 接手，base main 为 `7501d14730ced16995634db870f0f83ee65325a1`。检查未发现仓库 `AGENTS.md` 或 `.agents/skills`。在 iMac 上使用本地无界面 Chromium 和合成数据；未操作生产服务、数据库、部署或 PR 合并，未修改 macOS UI 权限。

- 前后端 `npm run build`、前端 `npm run typecheck`、全仓 ESLint、变更文件 Prettier 和 `git diff --check` 通过。
- 30 项主题注册/单配色模式、Sakura 图案、CSS 作用域/动画/高亮继承、404 watcher 随组件作用域卸载和 Admin API 单测通过；4 项后端真实 DTO/内存配置测试、4 项 Markdown/媒体内容测试通过。
- 54 项浏览器检查全部通过，无跳过：22 项功能测试 + 32 项零容差截图比较。功能包含同 document 内双向完整组件树切换、Admin 保存/未保存/刷新、Back/Forward、独立明暗 cookie、菜单 Teleport/Toast、离开后台前确认取消/提示框及滚动锁的首帧清理、Admin 全局 500 下弹窗清理与恢复、两主题已离开页面的延迟 404、全部公共 URL、分页、真实契约合成媒体、zh/en、1440/390px、80/150%字号、两种字体、直达/SPA/内容 404、500 与恢复、配置失败无循环。
- 截图基线来自保存的改造前构建，使用相同数据、随机 seed、字体/图片和视口：Sakura 的首页、搜索、文章、独立页面、关于我、标签和 Admin 基本配置 × 两种宽度 × light/dark，28 组像素差异为 0；另 4 组已保存 Minimal 的 Admin 基本配置与原 Admin 基线完全一致。截图比较覆盖相同视口可见区域；另人工查看两主题全页文章截图及窄屏最大字号暗色媒体截图。
- Minimal 首次载入没有请求 Sakura 图片或加载 Sakura 样式；双向 SPA 切换后的 DOM 与计算样式断言确认已载入 CSS 不影响另一个主题。
- 独立只读复核发现的异步 404 watcher 作用域、Admin 命令式浮层跨表面残留及全局错误边界均已修复；复核最终代码没有剩余阻塞发现。
- 全量 unit：83 通过、13 失败。失败为未改动的运维脚本在 macOS 上不支持 GNU `mktemp --suffix=.partial` 或 `/var` 符号链接路径检查；没有扩展到运维兼容修复。
- 全量 Prettier 仍被原有未改动的 `tests/e2e/album-busy.spec.ts` 阻挡；本次所有变更文件通过。

未运行真实 PostgreSQL/后端 HTTP 全量集成、完整媒体上传/PR38 忙碌回归、可见原生浏览器操作、SSR、Safari/Firefox 或真实触屏测试。以上合成检查不代表这些检查已通过。证据保留在本地忽略目录 `artifacts/theme-system/` 与 `artifacts/theme-baseline/`。

### 2026-10-08 遗留问题收敛（基线 5ce8f168）

本轮核对远端 HEAD 为 `5ce8f168c469be294caaaf003d31ac743a9b9863`，仅修复五项问题，保留完整主题架构与部署方式。依照用户最新限制，没有新增测试文件、测试用例或扩展原用例；下面的故障场景只做 stdin 一次性验证，不持久化到测试套件。

1. 初始化状态与加载状态分离，语言刷新不卸载主题，不清空有效配置；失败仍可重试。请求序号防止过期响应写入，过期调用跟随最新请求结果。Sakura 错误条增加导航高度留白，使失败重试按钮不会被固定 Header 遮住；正常外观不变。
2. 保存与应用结果分开。PUT 失败提示保存错误；PUT 成功、GET 失败提示部分成功；重试仅 GET。快速刷新竞态中的反馈以最新实际应用结果为准。
3. Admin 失败安装清除 rejected Promise，成功插件不重复注册，并保留导航失效机制。安装期间检测 CSS 预加载失败，避免 Nuxt 吞掉错误后出现无样式后台。资源失败使用 `app/error.vue` 的轻量恢复分支，不依赖 Admin JS/CSS；整页刷新是模块/CSS 下载缓存失败的可靠重试路径。
4. 公共控件与 HTML 统一用 `resolveThemeColorMode` 计算实际配色；只支持一种配色时隐藏控件、保留用户原偏好。Sakura/Minimal 的双配色与 Admin 独立状态不变。
5. PostCSS 只对 `html`、`:root` 或独立根 `.dark` 追加根约束；`.card.dark`、`.panel.dark:hover` 与嵌套 `:is()` 保留组件状态语义，仍受主题作用域约束。

| 已执行命令                                                                                                                                                                                                          | 本轮结果                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run build`                                                                                                                                                                                                     | 前后端通过                                                                       |
| `npm run typecheck`                                                                                                                                                                                                 | 通过                                                                             |
| `npm run lint`                                                                                                                                                                                                      | 全仓通过                                                                         |
| 变更文件 `npx prettier --check ...`、`git diff --check`                                                                                                                                                             | 通过                                                                             |
| `node --import tsx --test tests/unit/public-document.test.ts tests/unit/site-themes.test.ts tests/unit/blog-layout.test.ts apps/frontend/build/surface-styles.test.ts apps/frontend/app/features/admin/api.test.ts` | 现有 30 项通过                                                                   |
| `node --test apps/backend/test/settings-theme.test.cjs`                                                                                                                                                             | 现有 4 项通过                                                                    |
| `npm run test:content`                                                                                                                                                                                              | 现有 4 项通过                                                                    |
| `npm run test:themes`                                                                                                                                                                                               | 现有 54/54 通过，无跳过；22 项功能 + 32 项零差异截图                             |
| `npm run test:unit`                                                                                                                                                                                                 | 现有 96 项：83 通过、13 失败；仍为未改动运维脚本的 macOS mktemp 与 /var 路径问题 |
| `npm run format:check`                                                                                                                                                                                              | 仍仅原有未修改 `tests/e2e/album-busy.spec.ts` 不通过                             |

一次性核实：两主题根/导航 DOM 实例在语言请求期间、成功和失败后保持相同；保留旧数据、可点击重试、快速语言切换及强制请求竞态正常。Admin 未保存草稿、PUT/GET 成功或失败、GET-only 重试和陈旧 GET 失败后的最新主题反馈正常。依赖边界核实安装缓存失败重试、并发共享、插件注册一次及取消；独立复核者用 iMac 无界面 Chromium 实际拦截 Admin JS/CSS，确认轻量恢复与整页刷新可用。单配色合成配置核实实际状态、禁用写入和偏好恢复；八类 CSS 选择器在三种表面的真实 DOM 上保持匹配语义，非活动表面无匹配。初轮一次性脚本遇到 Toast/错误条的定位歧义和空元素 hover，修正验证脚本定位/合成尺寸后检查通过，没有改动套件。

独立只读复核没有剩余阻塞发现。已知保守范围：Admin 安装期间遇到任意 CSS 预加载失败都要求整页刷新；极低频的同期公共主题 CSS 失败也可能触发该恢复路径。没有为此扩大构建机制。真实数据库/完整 HTTP、SSR、Safari/Firefox、完整上传与可见原生 UI 仍未运行，不代表已通过。

本轮日志与最终截图保留在本地忽略目录 `artifacts/theme-followup/`；没有上传 Library、修改 macOS 权限、数据库结构或部署流程，未部署或合并。

## Ury 主题（2026-10-08）

- 当前主题显示名称为 `sakura`；存储 ID `default` 保持稳定，`sakura` 是可读别名，均解析为同一个 Sakura 入口。没有自动重写历史配置。Minimal 保留。
- `ury` 是第三套独立页面、布局、样式、资源和错误入口。设计参考 [WordPress Ury](https://wordpress.com/theme/ury)，已在 dot 自己的云端浏览器查看官方演示：桌面固定侧栏，移动端头部置顶，衬线排版、大留白、细分隔线、宽幅图片。没有复制 WordPress 模板、远程字体或图片。
- 原有 `appearance.font/fontSize/avatar/cover/background` 和 `homepage` 配置继续保存并服务 Sakura；Admin 现有字体行为和独立明暗 cookie 保留。Minimal 固定使用独立的 system / 100% 缺省值，不再消费 Sakura 的字体/字号。Ury 不读取这些背景、图案、字体或首页横幅设置。
- Ury 单独保存到 `site.appearance.ury`：`palette`（light/sepia/dark）、`font`（serif/sans）、`fontSize`（80–150）、`readingWidth`（comfortable/wide）、`showAvatar`、`showCovers`。外观面板的 Sakura/Ury 子标签可独立编辑，与当前选中的网站主题无关。切换只改主题 ID，不重置任一配置。
- Ury 缺省值为 light/serif/100/comfortable/true/true。旧数据按读取时缺省值展示，无数据库迁移。DTO 校验可选嵌套字段；保存部分 Ury 配置时合并已有字段，老客户端省略 Ury 或整个 appearance 时保留已有设置。
- 阅读者的 Ury 配色只写 `cool_ury_palette`，不会更改 `cool_theme` 或 `cool_admin_theme`；选“网站默认”可恢复跟随保存的 Ury 默认色。字号、字体和阅读宽度只作用于 Ury 的公共页面和错误页。
- 主页沿用 `/public/timeline` 的摘要契约，不额外逐篇请求全文，保留混合文章/瞬间、加载更多和重试。搜索和标签采用紧凑标题/日期列表。正文、目录、Markdown 媒体、分享、关于页、独立页和错误恢复复用原业务契约，各自独立渲染。
- 系统字体栈包含 Georgia/Times New Roman 及可用的中日韩衬线回退，没有新增字体请求。用户上传的正文媒体始终可见；关闭封面仅影响 Ury 展示封面。测试扩展见下方最新记录。

### Ury 首次提交验收记录（历史，基线 0cac6b4）

**浏览器/视觉验收被云端运行环境阻挡，本轮不应标记为可合并或已完成截图验证。** 以下状态仅对应新增 Ury，不继承上方历史轮次的浏览器通过结论。

- 已通过：前后端 production build、前端 typecheck、全仓 ESLint、96 项现有 unit、4 项现有后端配置测试、4 项现有内容测试、变更文件 Prettier、`git diff --check`。
- 一次性实际 `ValidationPipe` / `SettingsController` 内存数据库验证：旧客户端省略 Ury/appearance 均保留配置；嵌套部分更新保留其他字段；保存后可再次提交；12 类非法值（含数组、null、非法枚举/类型/字号）拒绝。独立代码审查发现并修复 `ValidateNested` 允许数组的问题，新增 `IsObject` 约束。读取归一化和 `sakura` 别名另经一次性验证。
- 没有新增测试用例或测试文件。仅把一个现有浏览器选择器中的旧显示名称“默认主题”改为用户要求的 `sakura`，断言和覆盖范围不变。
- 22 项现有浏览器功能测试在 Chromium 启动阶段全部被环境阻挡，未进入用例正文，不属于应用测试失败或通过。系统 Chromium 在 `process_singleton_posix.cc:297` 因 `socket() failed: Operation not permitted` 中止；授权的提权执行仍遇到相同限制。后续诊断还遇到 bubblewrap `/root/.codex: Not a directory`。Playwright 官方 Chromium 下载返回损坏/截断的 ZIP；可用系统浏览器也无法启动。
- 自己的云端浏览器已查看 WordPress 官方 Ury 演示，但无法连接隔离执行环境的本地预览。尚未验证 Ury 实际渲染截图、桌面/移动端交互、SPA/刷新设置往返、配色/语言切换或截图兼容性。需在支持本地浏览器进程的授权云环境补验；没有改用用户 iMac，也没有部署临时远程预览。
- 未操作生产、数据库迁移、部署或合并。PR 保持 draft。

## Ury 最终审查修复（最新，基于 0cac6b4）

**浏览器与截图验收仍为 BLOCKED，PR 保持 draft，不宣称可合并。** 用户已在本轮明确授权新增/扩展测试；此前“不新增测试”的限制只属于历史轮次。

### 本轮实现

- 每个主题在自己的 `appearance.ts` 声明字体、字号、配色读取规则及阅读者 cookie 名称。共享 `useSiteAppearanceHead` 只分发表面/文档状态与当前定义的输出，不导入 Ury composable、不增加 theme ID 条件分支。定义只包含非视觉配置函数，不加载其他主题 CSS/组件/资源。
- Sakura 原有字体、字号、图案、背景、首页和存储值保持。Minimal 的默认行为明确为 system / 100%，移除其泡泡字体声明；不会随 Sakura 专属设置改变，也不重写或删除历史数据。Ury 只读自己嵌套配置。Admin 保留既有字体行为与独立 cookie。
- `useReaderPalette` 提供按 cookie 命名的共享响应状态：Sakura/Minimal 沿用 `cool_theme`，Ury 使用 `cool_ury_palette`，Admin 使用 `cool_admin_theme`；Admin 初次继承旧偏好后仍独立保存。它不负责渲染或主题 ID 判断。
- Ury 主页使用 `useTimelineAutoload` 观察底部 sentinel，接近视口时加载下一页。它遵守 pending、error、started、cursor 状态，对同一 cursor 只自动请求一次，失败后不会自动重试；保留“加载更多”和显式“重试”。无 IntersectionObserver 时只有手动加载。语言重置会重置 cursor 防重复记录，卸载会停止观察并忽略已排队回调；原 `useTimeline` 继续拒绝旧语言/已卸载请求结果并防止并发请求。
- Ury 侧栏与文章作者头像统一：开启时优先上传图，无上传图使用 Ury 自己的 SVG 标识；关闭则不显示图片。64×64 / 48×48 容器保持正方形，使用 object-fit；不加载 Sakura 默认头像资源。

### 持久化测试覆盖

- `tests/theme/site-themes.spec.ts` 和 `race-review.spec.ts` 扩展到三主题：公共路由、zh/en、1440/390、分页/媒体、直接/SPA/内容 404、全局错误恢复、延迟 404、Admin 确认弹层和滚动锁清理。Minimal 字号断言改为独立 100%，原 Sakura 断言保留。
- `tests/theme/ury.spec.ts` 增加六个有向主题对的 SPA 往返与 CSS 隔离、Ury 配置保存/刷新/草稿隔离、三配色的阅读者覆盖/恢复网站默认、serif/sans×80/150%×两种宽度×三配色×zh/en×1440/390 的溢出检查。覆盖文章/瞬间、分页、正文/搜索/标签/关于页由扩展的公共路由套件执行。
- Ury 正文验证图片解码、视频 controls/无 autoplay、代码文本、表格、目录；视频采用无内容的合成响应，仅验证安全 DOM 与布局，不能代替真实视频播放/编解码验证。头像测试覆盖上传/缺省/关闭及比例和资源隔离。自动加载测试覆盖耗尽、失败/显式重试、无观察器、重复 cursor、语言重置与延迟结果在主题切换后的失效。
- Ury 视觉用例会为桌面/移动、zh/en、light/sepia/dark 的首页和正文生成 24 张全页截图。截图必须实际生成并人工检查后才能声称视觉通过；当前没有任何新截图或对比通过结果。旧 32 项基线用例保持独立，不自动更新基线；缺少基线时按原行为显式跳过。
- `tests/unit/theme-runtime.test.ts` 用真实 Vue scheduler 验证自动加载的并发/失败/重复 cursor/语言重置/卸载边界、`useTimeline` 的旧语言和卸载完成保护，以及 cookie 状态隔离。主题单测验证配置读取边界、不改写保存数据、Ury 视觉资源独立和共享 head 不含主题 ID 分支。
- 后端配置套件增加真实 DTO/controller 的 Ury 省略/部分更新/往返与 12 类非法配置拒绝，避免只用浏览器模拟保存证明后端兼容。

### 本轮执行状态与环境边界

- 前后端 build、frontend typecheck、全仓 ESLint、变更文件 Prettier、diff check 和现有内容测试已执行。单测/DTO 的最终数量见 PR 当轮报告。
- Playwright 测试发现/加载完成：`npx playwright test --config playwright.theme.config.ts --list` 列出 **80 项**（48 功能 + 32 旧截图基线）。这些脚本另外用 TypeScript 对全部 `tests/theme/*.ts` 静态检查通过；发现和静态检查不等于浏览器执行通过。
- 本轮没有再次启动被拒绝的浏览器，也没有重复提权或更换机器绕过限制。沿用已确认的 blocker：Chromium 所需 `socket()` 被执行环境拒绝（EPERM），先前提权仍受限且一次诊断遇到 bubblewrap `/root/.codex` 挂载错误；云浏览器连不到本地隔离预览。没有新的受支持环境状态变化或修复通道。
- 因此本轮 48 个功能浏览器用例与 32 个基线用例均未运行；24 张 Ury 截图没有生成或检查。旧基线当前也不在此云 checkout 中，不能宣称零差异。需要在允许 Chromium 的授权云环境执行 `npm run test:themes` 并补验后，才能消除此验收阻塞。
- 只操作自己的云工作目录；没有连接 iMac，没有新 PR、生产操作、部署、数据库迁移、合并或标记 ready。

## 配置对象、视觉状态与英文文案的定点修复（最新，基于 85cf60f）

- 为 `SiteDto.appearance`、`SettingsDto.site`、`SettingsDto.homepage` 增加 `IsObject`。真实 ValidationPipe 会在进入 controller 前拒绝数组（含空数组与有效 DTO 元素数组）、null、字符串、数字和布尔值；必需的 site/homepage 省略仍拒绝。appearance/themeId/ury 的合法省略和 Ury 部分字段合并逻辑不变，没有数据库迁移或读取时重写。
- 后端测试用真实 class-transformer/class-validator/ValidationPipe 与内存数据库，先验证合法保存，再对三个边界逐项提交非法形状并断言 400、零 upsert、原始存储 JSON 完全不变；已有历史请求、省略、Ury 部分更新与保存往返测试继续运行。
- 旧截图用例仍按原策略 `test.skip` 缺失基线，没有把基线加入 Git，也不让非浏览器测试因缺基线失败。新增小型 Playwright reporter 明确区分“比较通过”“失败/受阻”“跳过”“未执行”“基线生成”。捕获/更新基线的成功执行不是截图比较通过；即使命令退出 0，只要缺失/跳过/未执行就输出视觉验收未完成。只选功能测试时会输出视觉未执行。
- `public.ts` 补齐 Minimal/Ury 共用的“加载中…”、“加载失败”、“暂无内容”英文；中文键和界面行为不变。轻量单测检查这三种状态、既有重试翻译，以及两个主题源码内中文 literal `t()` 键的英文覆盖。该静态检查只针对 literal 界面键，不检查 API 作者内容或任意动态字符串。
- **本轮明确不运行浏览器，不修复浏览器环境，不生成截图，不创建/提交基线。** Playwright 源码及历史基线策略保留；当前 HEAD 的浏览器/视觉验收仍为未执行/受阻，不能继承历史通过结论。非浏览器实际执行结果见 PR 最新摘要。
