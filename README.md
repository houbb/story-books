# Storybook Engine

> 一座可以阅读的故事森林

把 `stories/` 目录里的 Markdown + 图片丢进去，前端自动发现、解析、建立目录和故事树，并渲染成一本真正可以翻页的电子书。

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # 产物到 dist/
pnpm preview      # 预览构建结果
```

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
│   ├── story/        Story Engine — Loader/Parser/TreeBuilder/Index
│   └── book/         Book Engine — Paginator/PageFlip 封装
├── stores/           Pinia 状态
├── components/       Vue 组件
├── composables/      Vue 组合式函数
├── styles/           主题/字体/纸张
└── stories/          内容源（Markdown + 图片）
```

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

放任意 `stories/**` 子目录下即可，前端会自动出现在目录与故事树中。

## 测试与验证

```bash
pnpm test       # Story Engine 单元断言
pnpm test:e2e   # Playwright 真实浏览器流程
pnpm typecheck  # Vue + TypeScript 类型检查
pnpm build      # 生产构建
```

> E2E 会启动本地 Vite 服务，并模拟真实用户点击、主题切换和配乐播放。首次运行需要准备 Playwright 浏览器。

## 柔和配乐

首页和阅读器右上角提供 `sound off / sound on` 控制。配乐是项目内置的原创短循环环境音，默认静音；只有用户主动点击后才会播放，适合阅读时作为轻柔背景，不依赖外部音乐服务。

## 技术栈

Vue 3 · TypeScript · Vite · Pinia · Vue Router · markdown-it · page-flip · Vue Flow · VueUse · Google Fonts
