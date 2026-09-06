# Story Garden · 故事森林

> A digital storybook that lives at the edge of GitHub Pages — Markdown stories grow into a story tree, a hand-bound book, a story map, a search engine, and a quiet ledger of words.

把 `stories/` 目录里的 Markdown + 图片丢进去，前端自动发现、解析、建立目录和故事树，并渲染成一本真正可以翻页的电子书。新增的字数汇总、全文检索、字体控制和 GitHub Pages 自动部署让它不只是一本电子书，而是一座可以反复走进去的小花园。

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # 产物到 dist/
pnpm preview      # 预览构建结果
```

部署到 GitHub Pages：

1. 把仓库 `Settings → Pages → Source` 切到 **GitHub Actions**（首次需要）。
2. 推送到 `main`，CI 会自动跑 typecheck + 单测 + 构建并发布。
3. 站点访问地址：`https://<your-github-name>.github.io/story-books/`

更多细节见 [DESIGN_NOTES · 001 GitHub Pages](./design-docs/001-github-pages.md)。

## 你可以做什么

| 入口 | 路径 | 用途 |
|---|---|---|
| 封面 / 主菜单 | `/` | 进入阅读、跳到地图、字数汇总、检索 |
| 翻书阅读 | `/#/read` | 桌面端翻书体验，键盘 ← / → / Space / Home / End；手机端一屏一页滑动翻页 |
| 故事地图 | `/#/map` | 节点化的章节结构，悬停当前章节，⌘M 打开 |
| 字数汇总 | `/#/stats` | Hero 大数字 · 分章 chip · 字数排行榜（可点击跳转） |
| 全文检索 | `/#/search` | 标题 + 正文 + CJK bigram + latin token，⌘K 聚焦 |

阅读偏好（`Aa` 按钮，或在阅读页右上角）支持：主题（日间 / 夜间 / 自动跟随系统）、中文字体（霞鹜文楷 / 思源宋 / 系统宋）、英文字体（Cormorant / Inter / Georgia）、字号档位（S / M / L / XL），全部写入 `localStorage`，刷新不丢；开启系统“减弱动态效果”后，翻页和页面动画会自动降为静止。

手机端阅读采用「一屏一页」滑动模式：每一页占满整屏宽度，左右滑动在封面、目录、章节封面、正文与尾声之间流畅切换，每页内容完整呈现，不再有翻书动效下的双页占位与内容遮挡；单页内容超出屏幕时可在页内上下滚动，横向手势始终用于翻页。桌面端保留真实的翻书动画。

## 写一个故事

```markdown
---
title: 月亮落进森林
subtitle: Chapter One
cover: ./images/moon.jpg
order: 1
---

# 月亮落进森林

很久很久以前……
```

放任意 `stories/**` 子目录下即可，前端会自动出现在目录、地图、字数统计和检索里。

## 测试与验证

```bash
pnpm test         # 26 个单元断言：parser / tree / paginator (多页自然切片与页码对齐) / markdown / word-count / stats / search / bookmarks / 移动端一屏一页
pnpm test:e2e     # Playwright 真实浏览器流程：桌面 + mobile-iphone + mobile-small 多分辨率
pnpm typecheck    # vue-tsc 全量类型检查
pnpm build        # 生产构建（含 404.html 与 /story-books/ base）
```

E2E 默认调用系统安装的 Chrome（macOS 13 无法下载 playwright 自带 headless shell 时自动降级）。包含 320px、390px 小屏幕移动端几何无裁剪断言、一屏一页滑动断点与页码同步校验，确保手机端阅读器工具栏、安全区与手势体验稳定。

## 设计原则

1. **Markdown 是内容源，Story Tree 是结构，Book 是阅读表现层**
2. **Content First**：Markdown 是唯一真正的内容源
3. **File System = Story Structure**：目录天然就是故事树
4. **接口优先 + 策略模式 + 插件化铺路**：所有模块可替换、可扩展
5. **Editorial + Paper + Cinematic + Minimal**：克制、有设计感

## 目录结构

```
src/
├── core/
│   ├── story/        Story Engine — Loader/Parser/TreeBuilder/Index/WordCounter/StoryStats/StorySearchEngine
│   └── book/         Book Engine — Paginator/PageFlip/FlipPageList/MarkdownRenderer/PageRenderer
├── stores/           Pinia 状态（settings 含字体偏好、story、book）
├── components/
│   ├── book/         翻书页组件（封面、目录、章节、末页）+ 移动端滑动容器
│   ├── reader/       阅读器外壳（ReaderChrome / SettingsPanel）
│   ├── story/        StoryMap 节点视图
│   └── SearchFab     全局 ⌘K 入口
├── composables/      Vue 组合式函数（useAmbientAudio）
├── styles/           主题 / 字体 / 纸张
└── views/            Home / Reader / StoryMapView / StatsView / SearchView
stories/              内容源（Markdown + 图片）
```

## 技术栈

Vue 3 · TypeScript · Vite · Pinia · Vue Router · markdown-it · page-flip · Vue Flow · VueUse · Google Fonts

## 柔和配乐

首页和阅读器右上角提供 `sound off / sound on` 控制。配乐是项目内置的原创短循环环境音，默认静音；只有用户主动点击后才会播放，适合阅读时作为轻柔背景，不依赖外部音乐服务。
