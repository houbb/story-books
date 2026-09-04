# 变更日志

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
