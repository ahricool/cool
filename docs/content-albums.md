# 内容与相册整合

文章和瞬间共用 `Post`、编辑器、草稿、标签和双语发布记录。`type` 由作者显式选择 ARTICLE/MOMENT；互转只更新类型，不更换 ID、slug、正文、状态、时间或素材。ARTICLE 的每种已发布语言必须有非空标题；草稿和 MOMENT 标题可空。时间线只读取统一内容表，每个 ID 出现一次；文章始终有摘要/阅读全文，空封面不生成默认图，瞬间完整显示正文与可选标题。`/about` 及原 Page 数据保持，公开名称改为“我”。

相册是独立 `Album` 和有序 `AlbumItem`，上传继续使用 `Media` 和原文件目录。名称必填且唯一，支持英文名称/说明，说明和手选封面可空，可创建空相册。未指定相册的上传进入不能删除的默认相册。封面优先手选，其次排序第一张图片，最后 `site.appearance.cover` 全局图案；初始圆点，与背景共用图案生成器。删除被正文/页面/账户/配置引用的素材或含这些素材的相册返回 409。删除相册只把成员移到默认相册，不删除文件；旧照片记录继续保留。移除正文引用只改正文。

图片最多 8 MB，经原 Sharp 管线规范化为 WebP；MP4/WebM 视频及 MP3/WAV/Ogg/M4A/WebM 音频最多 64 MB，保留源字节，校验白名单 MIME 和容器签名。媒体读取使用存储 MIME、nosniff 和原 Express 文件/range 响应。播放器 `controls preload=metadata`，无 autoplay。管理相册与上传不生成时间线内容。

## 增量迁移规则

`20261005000000_content_albums` 在 PostgreSQL 单一事务内执行，由 Prisma migration ledger 保证再次 deploy 不重复写入；不要手工重复 SQL。无 DROP、无历史数据删除、无文件改写。

- 原 posts/pages/tags/分类与素材保持 ID、slug、正文和关系，原路径迁移批次不重跑（deploy 的旧路径工具会检查已完成批次）。
- 旧 Moment 没有 slug，也没有现存公开详情路由；新内容使用原 Moment UUID，增加 `sourceMomentId`，仅为这些原本没有地址的记录分配新的 8 位路径。旧 moment/translation 表保留，复制正文/状态/发布时间/创建更新时间。ID 冲突或缺少站长账户时整笔迁移回滚，不覆盖旧文章。
- 旧 Photo 只有单张照片与 `PhotoTranslation.album` 字符串。每张照片优先中文记录、否则英文，按 trim 后名称归册，空名称归默认册。同一照片不会因双语名称拆成两册；册英文名取该组第一条非空英文名，所有原始双语别名、标题、说明留在 PhotoTranslation，由 `legacyPhotoId` 找回。同 URL 的不同历史照片也各保留自己的关系。
- `Photo.url` 对应原本机 Media URL 时建立 `mediaId`，否则保留原 URL。每个原 Photo 都有成员关系；不属于任何旧照片的 Media 进入默认册。排序采用原创建时间和 ID，不猜测历史排序。

上线前仍应使用现有备份流程保存数据库与媒体，记录 posts/moments/photos/media、各翻译表及素材关联数量，并比对旧 slug 和文件清单/哈希。本 PR 不进行生产迁移、merge 或 deploy。

## 恢复与检查

迁移失败由事务恢复原状。迁移前备份可以在隔离数据库中恢复和核对；回到旧应用时应恢复同一时间点的数据库备份，保留完整媒体目录，再核对旧 ID/slug/数量和哈希。不要对生产执行 DROP 或手工删除新增内容。迁移后若已有编辑，先导出统一内容、相册/成员和文件清单，再决定恢复时间点，避免丢失新编辑。旧 moment/photo 表为迁移时快照，并非持续双写，不能直接用它们覆盖新内容。

本地验证使用独立 `*_test` PostgreSQL；新增迁移测试在临时 schema/事务内核对双语、ID、旧 URL 和 Photo→Media 关系；生命周期测试验证转换、独立语言、排序、三类素材读取/range、引用保护与移除引用不改文件。实际截图与检查结果记录在 PR，未经执行的浏览器检查明确标为待验证。

## 正文素材格式

相册选择器插入具体素材快照，正文使用受限 `cool-media` Markdown fence：`layout` 为 `vertical/grid`，`assets` 为 `{id,url,name,mimeType}` 数组。每组可在编辑器中独立改布局，源码也可编辑；后续增加相册成员不会修改旧正文。普通历史 Markdown 图片保持原格式。

共享渲染器禁用 raw HTML，素材组只允许本机媒体 URL/既有本地图像，拒绝外部或可执行地址，转义名称，固定生成图片或原生播放器结构；无未净化 HTML 注入。插入/布局修改使用 textarea 原生 insertion，保留光标、选区和撤销历史；取消不修改正文，草稿继续按内容/语言隔离。
