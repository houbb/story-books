## 0.5.1 · 一屏一页，翻页不再遮内容

### 移动端阅读体验重构（一屏一页滑动翻页）
- **移动端改为「一屏一页」滑动模式**：新增 `FlipPageList` 滑动容器组件，手机（<720px）阅读时每一页占满整屏宽度，左右滑动在封面、目录、章节封面、正文与尾声之间流畅切换，杜绝原翻书动效在单屏下「双页占位 → 显示不全 → 翻页遮内容」的问题，页面更大气、体验统一。
- **单页内容完整可达**：页面容器支持页内纵向滚动，长篇单页内容超出屏幕时可上下滚动查看，横向手势始终保留给翻页。
- **桌面端翻书体验不变**：桌面（≥720px）仍使用 page-flip 翻书动画；移动端与桌面端按视口宽度自动切换，阅读进度、章节跳转、偏好设置、恢复阅读位置等既有能力全部打通。
- **既有移动端交互同步适配**：顶部工具栏、底部翻页按钮、左右滑动、键盘 Home/End 与章节目录跳转在滑动模式下均正确驱动「一屏一页」滚动。

### 测试
- 新增单元断言 `tests/mobile-paging.test.ts`（6 条）：分页结构、每页唯一 id、100% 宽度样式契约、720px 断点、章节封面页码、正文切片契约。
- E2E 新增移动端滑动用例：整页占满屏宽、scrollTo 翻页后页码同步、无横向溢出；既有移动端用例改为断言 `chrome__top` 骨架与可见控件几何，规避媒体查询隐藏控件的干扰。

## 0.5.0 · 卷帙浩繁，舒卷自如

### 多章节自然分页与真实物理目录
- **SPI 接口优先**：抽象 `TocPaginationStrategy` 策略接口，提供 `DefaultTocPaginationStrategy` 默认分页策略，彻底解决 34+ 章节平铺时原单页目录截断被吞的问题。
- **两遍精确页码重排 (Two-pass Pagination)**：`BookPaginator` 先行推导目录所需占用的实际物理书页数，再对全书正文页码与 TOC 跳转目标页码做统一精准映射（精准指向对应的 `story-cover` 与切片页）。
- **典雅古典书页排版**：`BookIndex` 支持多页连续编排（`CONTENTS`、`CONTENTS · 2`...），附带精致点线连接（dotted leader）与续页标记，兼顾大屏与移动端排版。

### 阅读器工具栏响应式与沉浸体验
- **新增全书章节目录抽屉 (`ChapterTocDrawer`)**：在阅读任意页面时随时可通过顶部“📖 目录”工具呼出全书章节抽屉，快速换章跳转。
- **一键沉浸式全屏阅读**：顶部提供折叠收起工具，折叠后仅保留屏幕右上角极简半透明悬浮小胶囊，轻点即还原工具栏；移动端点击屏幕中央亦可智能呼出与收拢。
- **移动端小屏响应式收纳**：将低频次操作（分享、金句卡片、故事地图、配乐控制等）收纳进“⋯ 更多”轻量抽屉，在 375px/390px 屏幕下核心工具（返回、目录、设置、折叠）井然有序。

### 故事地图 (StoryMap) 智能网格流动
- **网格化蛇形排版 (Serpentine Flow)**：面对 34 篇以上扁平故事集合，由单一超长横线升级为 5 列蛇形网格流动连线，结构紧凑且阅读脉络清晰。
- **地图视口控制与导航**：内置放大 (`+`)、缩小 (`−`) 与一键视口自适应 (`⊙`) 控件，节点交互与当前章节保持平滑居中聚焦。

## 0.4.0 · 更顺眼，也更从容

### 移动端与小屏体验适配

- **阅读器顶部工具栏自适应**：在 540px 以下采用优雅的双层自适应布局（第一层返回与品牌标题，第二层全宽操作区可弹性换行），修复 320px / 390px 小屏幕下操作按钮被 14px 容器高度截断与文字挤压问题。
- **全屏沉浸与触控手势**：优化移动端轻触两侧（25%）翻页与中央点击唤出控制栏交互；超过 12px 判定为物理拖拽翻页，杜绝误触。
- **全局安全区与窄屏优化**：全站主页、书架、检索、统计、故事地图与阅读器适配 iOS / Android `safe-area-inset`，消除横向滚动与溢出。
- **端到端测试覆盖**：Playwright E2E 矩阵新增 `mobile-iphone` (390×844) 与 `mobile-small` (320×568) 项目，加入 `document.elementFromPoint` 物理击穿检验，断言小屏下按钮中心点命中自身无祖先裁剪。

### 自动夜间与减弱动效

- 主题设置新增“日间 / 夜间 / 自动”三态，自动模式跟随系统 `prefers-color-scheme` 并实时响应变化。
- 修复应用启动时主题属性直接写入 `auto` 导致 CSS 主题无法命中的问题，统一由设置状态解析有效主题后初始化 DOM。
- 设置面板新增主题三态控件，并为当前选择补充 `aria-pressed` 状态。
- 支持系统 `prefers-reduced-motion: reduce`：降低全局过渡与动画，并将翻页时长设为 0。
- README 增补主题与无障碍动效说明。

## 0.3.0 · 一座可以阅读的故事森林

> 本次新增 GitHub Pages 自动部署、Story Map 美化、字数汇总、全文检索、字体控制五大块，所有功能已经过单元 + E2E 双重验证。

### GitHub Pages 自动部署

- 新增 `.github/workflows/deploy-pages.yml`，每次推送 `main` 触发 `typecheck → vitest → vite build → deploy-pages`，产物落到 `gh-pages` 环境。
- `vite.config.ts` 新增 `base: '/story-books/'`，并在 `generateBundle` 阶段克隆 `index.html` 为 `404.html`，给历史模式留兜底。
- README 同步新增 "部署到 GitHub Pages" 步骤。

### Story Map 美化

- 节点展示字号 / 字数 / 预计阅读时间，顶部带序号徽章。
- 加入阅读顺序虚线（章节之间平滑动画 + 阅读当前章节实线高亮）。
- 每次章节切换自动 `setCenter` 居中当前节点。
- 卡片化样式 + 当前节点 ring 阴影 + 悬停抬升过渡。

### 字数汇总（`/#/stats`）

- 新增 `WordCounter` 核心接口与默认 CJK / Latin 计数实现（接口可替换，遵循策略模式）。
- 新增 `StoryStatsProvider` 提供总字数、总章节、按章聚合、按字排序的排行榜。
- 新增 `/stats` 视图：Hero 大数字 · 分章 chip · 排行榜（点击跳转阅读）。

### 全文检索（`/#/search`）

- 新增 `StorySearchEngine`，标题 / 正文 / CJK bigram / latin token 综合打分。
- 新增 `/search` 视图，输入即检索、URL 同步 query、高亮片段、点击跳转阅读。
- 全局 `⌘K`（或 `Ctrl+K`）快捷键 + 浮动 SearchFab 入口。

### 字体控制

- `settings` store 新增 `cjkFont`（wenkai / noto / songti）、`latinFont`（cormorant / inter / georgia）、`fontSize`（13/15/17/19）。
- 新增 `SettingsPanel` 组件，挂在 ReaderChrome 右上角 `Aa` 按钮。
- `tokens.css` 新增 `data-cjk-font / data-latin-font / data-font-size` 属性 → CSS 变量覆盖，切换实时生效。

### 测试

- 单测从 4 个扩到 **16 个**：覆盖 parser / tree / paginator / markdown / WordCounter（含可替换策略验证）/ StoryStats / StorySearchEngine。
- E2E 从 2 个扩到 **5 个**：覆盖进入阅读器、主题切换、字数汇总、检索、字体偏好持久化。
- Playwright 在 macOS 13 上自动降级到系统 Chrome 通道。
- `pnpm build` 通过：`vue-tsc --noEmit` 干净，产物包含 `index.html` + `404.html`，所有 asset 路径已带 `/story-books/` 前缀。

## 0.2.x · 上一版

- 翻书阅读、Story Map、主题、配乐、Pinia 状态、page-flip 集成。
