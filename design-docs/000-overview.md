这个项目我建议**不要做成“Markdown 阅读器 + 一个翻页插件”**，而是把它设计成一个真正的 **Digital Storybook / Interactive Story Atlas**：

> **Markdown 是内容源，Story Tree 是内容结构，Book 是阅读表现层。**

核心体验应该是：

**打开书 → 看见封面 → 打开目录 → 看到故事树 → 选择一个故事 → 进入纸张阅读 → 翻页 → 在章节之间沿着故事树探索。**

而且整个系统最好做到：

> **用户只需要往 `stories/` 目录里丢 Markdown + 图片，前端自动发现、解析、建立目录和故事树。**

---

# 一、我建议的最终产品形态

整体可以设计成下面这个结构：

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    THE STORY GARDEN                         │
│                                                             │
│                  一座可以阅读的故事森林                     │
│                                                             │
│                         ┌───────┐                           │
│                         │ 进入  │                           │
│                         └───────┘                           │
│                                                             │
│                       ✦  12 stories                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓

                    ┌─────────────────┐
                    │                 │
                    │   故事目录      │
                    │                 │
                    │    INDEX        │
                    │                 │
                    │   ├─ 序章       │
                    │   ├─ 第一章     │
                    │   │   ├─ A       │
                    │   │   └─ B       │
                    │   ├─ 第二章     │
                    │   └─ 尾声       │
                    │                 │
                    └─────────────────┘
                              ↓

              ┌─────────────────────────────────┐
              │                                 │
              │          ╭───────────╮          │
              │         ╱             ╲         │
              │        │   STORY      │         │
              │        │              │         │
              │        │   第一章     │         │
              │        │              │         │
              │        │  很久以前…… │         │
              │        │              │         │
              │        ╰──────────────╯         │
              │                                 │
              │       ← PREVIOUS   NEXT →       │
              │                                 │
              └─────────────────────────────────┘
```

但我更推荐把“故事树”做成一个非常有设计感的**星图 / 森林 / 枝桠结构**，而不是传统 TreeView。

---

# 二、最重要的设计原则

我会定下来 5 个设计原则。

### 1. Content First

Markdown 是唯一真正的内容源。

```text
stories/
├── index.md
├── prologue.md
├── forest/
│   ├── moon.md
│   ├── river.md
│   └── fox.md
└── ending.md
```

前端不保存故事正文。

---

### 2. File System = Story Structure

目录天然就是故事树。

例如：

```text
stories/
├── 00-prologue.md
├── 01-forest/
│   ├── 01-moon.md
│   ├── 02-river.md
│   └── 03-fox.md
├── 02-city/
│   ├── 01-night.md
│   └── 02-station.md
└── 99-ending.md
```

自动生成：

```text
序章
│
├── 森林
│   ├── 月亮
│   ├── 河流
│   └── 狐狸
│
├── 城市
│   ├── 夜晚
│   └── 车站
│
└── 尾声
```

这会非常适合你的“故事树”概念。

---

# 三、技术架构

我建议：

```text
Vue 3
│
├── Vite
│
├── TypeScript
│
├── Pinia
│
├── Vue Router
│
├── Markdown Pipeline
│   ├── markdown-it
│   ├── frontmatter
│   └── Shiki
│
├── Story Engine
│   ├── Story Loader
│   ├── Story Parser
│   ├── Story Tree Builder
│   └── Story Index
│
├── Book Engine
│   ├── Cover
│   ├── Index
│   ├── Page
│   └── Page Navigation
│
└── UI
    ├── Story Tree
    ├── Book
    ├── Progress
    ├── TOC
    └── Settings
```

---

# 四、Markdown 不应该直接等于 Vue 页面

这是整个项目一个很重要的架构决定。

不要：

```text
xxx.md
 ↓
直接渲染
 ↓
页面
```

而应该：

```text
Markdown
   ↓
Parser
   ↓
StoryDocument
   ↓
StoryIndex
   ↓
BookPage
   ↓
Renderer
```

中间建立自己的领域模型。

---

# 五、定义 StoryDocument

例如：

```ts
interface StoryDocument {
  id: string

  path: string

  title: string

  subtitle?: string

  author?: string

  date?: string

  cover?: string

  description?: string

  tags?: string[]

  order?: number

  parentId?: string

  type: 'story' | 'chapter' | 'prologue' | 'ending'

  content: string

  children?: StoryDocument[]
}
```

这样未来就不会被 Markdown 绑死。

以后完全可以支持：

```text
Markdown
JSON
YAML
CMS
API
AI generated story
```

---

# 六、Markdown 使用 Frontmatter

我建议 Markdown 支持：

```md
---
title: 月亮落进森林
subtitle: Chapter One
author: Echo
cover: ./images/moon.jpg
description: 一个关于月亮、森林和狐狸的故事。
tags:
  - forest
  - moon
order: 1
---

# 月亮落进森林

很久很久以前……

森林里没有人类。

只有一只狐狸。

![狐狸](./images/fox.jpg)

它每天晚上都会抬头看月亮。
```

但这里有一个重要原则：

## Frontmatter 只写“需要覆盖默认推断”的东西

比如：

```yaml
title:
order:
cover:
type:
tags:
```

目录层级和默认顺序直接由文件系统推断。

这样用户非常容易维护。

---

# 七、目录自动构建

Vite 非常适合这个场景。

可以使用：

```ts
const modules = import.meta.glob(
  '/src/stories/**/*.md',
  {
    query: '?raw',
    import: 'default',
    eager: true
  }
)
```

得到：

```ts
{
  '/src/stories/prologue.md': '...',
  '/src/stories/forest/moon.md': '...',
  '/src/stories/forest/river.md': '...'
}
```

然后：

```text
File System
      ↓
Glob
      ↓
Markdown Parser
      ↓
StoryDocument[]
      ↓
Tree Builder
      ↓
StoryIndex
```

这比自己写文件扫描器简单很多。

---

# 八、图片处理

这个项目图片一定要做好。

我建议支持：

```md
![Moon](./images/moon.jpg)
```

目录：

```text
stories/
└── forest/
    ├── moon.md
    └── images/
        ├── moon.jpg
        ├── fox.jpg
        └── forest.jpg
```

通过 Vite 的 asset pipeline 自动处理。

这样用户替换故事的时候：

```text
替换 markdown
替换 images
```

就完成了。

不需要改 Vue。

---

# 九、Markdown Renderer

这里不要自己写 Markdown parser。

可以用：

* `markdown-it`
* `Shiki`
* frontmatter parser

`vite-plugin-md` 可以直接把 Markdown 编译为 Vue Component，而 `vue-markdown-shiki` 也提供了 Vue 3 + Markdown-it + Shiki 的组合。([GitHub][1])

不过对于你的项目，我反而建议：

> **不要把 `.md` 直接编译成 Vue Component。**

而是：

```text
.md
 ↓
raw text
 ↓
parse
 ↓
StoryDocument
 ↓
markdown-it
 ↓
HTML / AST
 ↓
StoryRenderer
```

因为你以后需要控制：

```text
Story → Book Page
Story → Story Tree
Story → Search
Story → Progress
Story → Recommendation
Story → AI
```

所以最好自己掌握中间层。

---

# 十、Book Engine 是整个项目的核心

这里我建议直接复用成熟项目。

其中比较合适的是 **StPageFlip / page-flip**。

它支持：

* HTML 页面
* 图片页面
* soft / hard page
* desktop 双页
* mobile 单页
* drag/swipe
* landscape / portrait
* zoom
* 无额外依赖

而且可以直接：

```ts
pageFlip.loadFromHTML(...)
```

非常适合你这种**真正 HTML 内容的电子书**，而不是把 Markdown 截成图片。([GitHub][2])

Vue 生态还有 `flipbook-vue`，提供 Vue 3 的 3D 翻页组件，但它的核心模型更偏向“图片页面”。([GitHub][3])

所以我的选择：

> **Book Engine：page-flip**
>
> **Vue 只负责生命周期和状态管理。**

---

# 十一、不要把“一篇 Markdown = 一张物理纸”

这是我认为这个项目最容易踩的坑。

例如：

```md
# 月亮

5000 字……
```

你不可能把 5000 字塞进一张纸。

所以应该：

```text
Story
 ↓
Content Layout Engine
 ↓
Book Pages
```

例如：

```text
StoryDocument
     │
     ├── cover
     │
     ├── title page
     │
     ├── content
     │     ↓
     │   pagination
     │
     └── ending
```

最终：

```text
Story #3
 ↓
Book Page 21
Book Page 22
Book Page 23
Book Page 24
```

因此：

> **故事是逻辑 Page，纸张是物理 Page。**

这两个概念必须分开。

---

# 十二、我建议的 Book 数据结构

```ts
interface BookPage {
  id: string

  storyId: string

  pageNumber: number

  type:
    | 'cover'
    | 'index'
    | 'story-cover'
    | 'content'
    | 'ending'

  content: string

  isChapterStart?: boolean
}
```

例如：

```text
Book
│
├── Cover
├── Index
│
├── Story A
│   ├── Page 1
│   ├── Page 2
│   └── Page 3
│
├── Story B
│   ├── Page 4
│   └── Page 5
│
└── Ending
```

---

# 十三、首页：不要直接展示目录

我建议首页非常克制。

整个屏幕：

```text
                 THE
              STORY BOOK


        ┌──────────────────────┐
        │                      │
        │                      │
        │       STORY          │
        │       GARDEN         │
        │                      │
        │      ───────         │
        │                      │
        │      12 STORIES      │
        │                      │
        └──────────────────────┘


             OPEN THE BOOK
```

背景可以有非常轻微的：

```text
grain
paper texture
ambient light
floating particles
```

不要大量动画。

重点是：

> **像一本高级艺术书，而不是一个后台系统。**

---

# 十四、打开书之后

动画：

```text
Cover
 ↓
Opening
 ↓
Index
```

目录不是普通：

```text
1. 第一章
2. 第二章
3. 第三章
```

而是：

```text
                    CONTENTS


       ──────── THE FOREST ────────

              01   月亮

                    │
                    │
              02   河流
                    │
                    ├─────────┐
                    │         │
              03   狐狸       │
                              │
                              │
       ──────── THE CITY ─────┘

              04   夜晚

              05   车站
```

也就是说：

> **目录本身就是故事树。**

---

# 十五、Story Tree 是这个产品的“灵魂 UI”

我不建议用 Element Plus 的：

```text
el-tree
```

虽然可以实现，但视觉上会变成后台系统。

你应该自己做：

```text
StoryTree
```

底层可以参考 Vue Flow。

Vue Flow 本身支持 Vue 3、zoom、pan、custom nodes、edges、minimap 等能力，非常适合拿来实现“故事地图”。([GitHub][4])

但我不会直接使用默认 Flow UI。

而是：

```text
                         ✦
                         │
                  ┌──────┴──────┐
                  │             │
                森林            城市
                  │             │
          ┌───────┼───────┐     │
          │       │       │     │
        月亮     河流     狐狸   夜晚
                  │
                 ★
```

Node 做成：

```text
       ┌───────────────┐
       │               │
       │    月亮       │
       │               │
       │   Chapter 01  │
       │               │
       └───────────────┘
```

或者更艺术化：

```text
                 ○
              月亮
               │
          ─────┼─────
               │
               ○
             狐狸
```

---

# 十六、Story Tree 应该支持两种模式

## Mode A：Tree

适合快速浏览：

```text
故事
├── 森林
│   ├── 月亮
│   ├── 河流
│   └── 狐狸
└── 城市
    ├── 夜晚
    └── 车站
```

## Mode B：Map

适合沉浸式探索：

```text
                    月亮

                      │

          狐狸 ───── 森林 ───── 河流

                      │

                     城市

                 ╱           ╲

              夜晚           车站
```

默认应该是 Map。

---

# 十七、阅读页设计

阅读页不要出现：

```text
Header
Sidebar
Breadcrumb
Card
Button
```

一堆业务 UI。

而应该非常像书。

例如：

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                       月亮落进森林                          │
│                                                             │
│                  CHAPTER ONE · THE FOREST                    │
│                                                             │
│                                                             │
│       很久以前，森林里没有人类。                            │
│                                                             │
│       每天晚上，月亮都会从树梢升起来。                      │
│                                                             │
│       有一只狐狸，总是坐在河边看着它。                      │
│                                                             │
│                                                             │
│                                                             │
│                    · · ·                                   │
│                                                             │
│                           17                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 十八、字体设计非常重要

建议不要默认：

```css
font-family: Arial;
```

而是：

### 中文

```text
Noto Serif SC
思源宋体
霞鹜文楷
```

### 英文

```text
Cormorant Garamond
EB Garamond
Libre Baskerville
```

最终组合：

```text
标题：
Cormorant Garamond + Noto Serif SC

正文：
Noto Serif SC

辅助信息：
Inter / Noto Sans
```

视觉会直接提升一个档次。

---

# 十九、纸张设计

建议不要白底。

例如：

```css
--paper: #f7f2e8;
--ink: #25221d;
--muted: #82796d;
```

纸张：

```text
background:
  radial-gradient(...)
  subtle noise
```

再加：

```text
inner shadow
outer shadow
paper edge
page curl
```

但是要克制。

---

# 二十、暗色模式不是简单黑色

建议做两种主题。

### Day

```text
Warm Paper
#F6F1E7
```

### Night

```text
Midnight Paper
#171717
```

夜间：

```text
背景：#10100F
纸张：#1C1B18
文字：#E7E0D5
```

而不是：

```text
background: black
color: white
```

那样太像网页。

---

# 二十一、阅读交互

鼠标：

```text
左侧区域
← 上一页

右侧区域
→ 下一页

拖动页面
翻页
```

键盘：

```text
← Previous
→ Next
Space Next
Esc Exit
Home Beginning
End Ending
```

移动端：

```text
Swipe Left
Swipe Right
```

---

# 二十二、底部 UI 应该非常隐蔽

正常状态：

```text
                         ···
```

鼠标移动：

```text
──────────────────────────────────────────────

          ←       17 / 84       →

──────────────────────────────────────────────
```

再增加：

```text
Index
Story Tree
Settings
```

但是自动隐藏。

---

# 二十三、左上角 Story Tree

阅读的时候可以有一个非常小的：

```text
☰
```

点击：

```text
┌──────────────────────────────┐
│                              │
│  STORY MAP                   │
│                              │
│  ○ 序章                      │
│    │                         │
│    ├── ○ 森林                │
│    │    ├── ● 月亮           │
│    │    ├── ○ 河流           │
│    │    └── ○ 狐狸           │
│    │                         │
│    └── ○ 城市                │
│                              │
└──────────────────────────────┘
```

当前故事：

```text
●
```

已经阅读：

```text
✓
```

未阅读：

```text
○
```

---

# 二十四、阅读进度

不要：

```text
67%
```

太产品化。

可以：

```text
Chapter 03

───────────────●────────────

The Forest
```

或者：

```text
17 / 84
```

极简即可。

---

# 二十五、故事之间的过渡

这个非常值得做。

例如读完：

```text
《狐狸》
```

不要突然跳：

```text
下一篇
```

而是：

```text
                   ✦

               THE STORY
                CONTINUES


                  狐狸

                   ↓

                  河流


              TURN THE PAGE
```

然后翻页进入。

---

# 二十六、Story Tree 的另一个高级交互

读到某个故事时：

```text
                     当前

                       ●
                      ╱ ╲
                     ╱   ╲
                   ○       ○
```

如果附近存在相关故事：

```text
      moon
        \
         \
         ●──── river
        /
       /
     fox
```

可以在页面边缘显示：

```text
2 related stories
```

点击：

```text
Explore
```

进入 Story Map。

这样它就不是普通电子书，而是：

> **可探索的非线性故事空间。**

---

# 二十七、自动目录生成规则

我建议定义：

```text
文件名
↓
默认 title

目录名
↓
默认 group

数字前缀
↓
order

frontmatter
↓
覆盖默认值
```

例如：

```text
03-forest/
├── 01-moon.md
├── 02-river.md
└── 03-fox.md
```

自动：

```json
{
  "title": "Forest",
  "order": 3,
  "children": [
    {
      "title": "Moon",
      "order": 1
    },
    {
      "title": "River",
      "order": 2
    }
  ]
}
```

---

# 二十八、可以进一步支持 `index.md`

例如：

```text
stories/
├── index.md
├── forest/
│   ├── index.md
│   ├── moon.md
│   └── fox.md
└── city/
    ├── index.md
    └── night.md
```

那么：

```text
stories/index.md
```

就是整本书的 metadata。

```md
---
title: 森林里的故事
subtitle: Stories from the Forest
author: Echo
cover: ./cover.jpg
description: 一些发生在森林里的故事。
theme: forest
---

这里是序言……
```

这样整个项目就非常容易替换内容。

---

# 二十九、项目目录我建议这样设计

```text
story-book/
│
├── public/
│   └── fonts/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── book/
│   │   │   ├── Book.vue
│   │   │   ├── BookCover.vue
│   │   │   ├── BookPage.vue
│   │   │   ├── BookIndex.vue
│   │   │   └── BookControls.vue
│   │   │
│   │   ├── story/
│   │   │   ├── StoryTree.vue
│   │   │   ├── StoryMap.vue
│   │   │   ├── StoryNode.vue
│   │   │   └── StoryPreview.vue
│   │   │
│   │   └── reader/
│   │       ├── Reader.vue
│   │       ├── ReaderToolbar.vue
│   │       └── ReaderProgress.vue
│   │
│   ├── composables/
│   │   ├── useBook.ts
│   │   ├── useStory.ts
│   │   ├── useStoryTree.ts
│   │   └── useReader.ts
│   │
│   ├── core/
│   │   ├── story/
│   │   │   ├── StoryLoader.ts
│   │   │   ├── StoryParser.ts
│   │   │   ├── StoryTreeBuilder.ts
│   │   │   └── StoryIndex.ts
│   │   │
│   │   └── book/
│   │       ├── BookEngine.ts
│   │       ├── BookPaginator.ts
│   │       └── BookPage.ts
│   │
│   ├── stores/
│   │   ├── book.ts
│   │   ├── story.ts
│   │   └── settings.ts
│   │
│   ├── styles/
│   │   ├── variables.css
│   │   ├── typography.css
│   │   ├── paper.css
│   │   └── animations.css
│   │
│   └── main.ts
│
├── stories/
│   ├── index.md
│   ├── cover.jpg
│   │
│   ├── 01-forest/
│   │   ├── index.md
│   │   ├── 01-moon.md
│   │   ├── 02-river.md
│   │   └── images/
│   │
│   ├── 02-city/
│   │   ├── index.md
│   │   ├── 01-night.md
│   │   └── images/
│   │
│   └── 99-ending.md
│
├── vite.config.ts
├── package.json
└── README.md
```

---

# 三十、组件层级

最终 Vue：

```text
App
│
└── StoryBook
    │
    ├── Home
    │
    ├── Book
    │   │
    │   ├── Cover
    │   │
    │   ├── Index
    │   │
    │   ├── Pages
    │   │   ├── StoryCover
    │   │   ├── ContentPage
    │   │   └── StoryEnding
    │   │
    │   └── Controls
    │
    ├── StoryMap
    │
    └── Settings
```

---

# 三十一、状态管理

Pinia 不需要搞得很复杂。

核心：

```ts
interface BookState {
  currentPage: number
  currentStoryId: string | null

  opened: boolean

  readingProgress: Record<string, number>

  theme: 'light' | 'dark'

  fontSize: number

  showStoryMap: boolean
}
```

---

# 三十二、URL 也要能够表达阅读状态

非常重要。

例如：

```text
/story/forest/moon
```

或者：

```text
/story/forest/moon?page=3
```

这样：

```text
刷新
分享
浏览器 Back
浏览器 Forward
```

都正常。

Vue Router 就能解决。

---

# 三十三、LocalStorage

可以记录：

```text
lastStory
lastPage
readingProgress
theme
fontSize
```

用户第二次打开：

```text
Welcome back.

Continue reading

《月亮落进森林》
Chapter 03 · Page 17
```

这是非常自然的 UX。

---

# 三十四、响应式设计

## Desktop

真正双页：

```text
┌─────────────┬─────────────┐
│             │             │
│    LEFT     │    RIGHT    │
│    PAGE     │    PAGE     │
│             │             │
└─────────────┴─────────────┘
```

## Tablet

仍然尽可能双页。

## Mobile

单页：

```text
┌───────────────────┐
│                   │
│                   │
│      STORY        │
│                   │
│                   │
└───────────────────┘
```

滑动翻页。

`page-flip` 本身就支持横竖屏和移动端模式，因此比较适合承担底层翻页效果。([GitHub][2])

---

# 三十五、动画设计

这个项目的动画一定不能太“Web”。

建议：

### Opening

```text
scale
opacity
perspective
```

### Page Flip

真实纸张：

```text
180° rotation
shadow
gradient
perspective
```

### Story Tree

```text
node fade
line draw
soft spring
```

### Story Transition

```text
page flip
+
chapter title fade
```

---

# 三十六、不要大量使用 Glassmorphism

这是我特别建议的一点。

不要：

```text
blur
glass
gradient
neon
```

搞成 AI SaaS Dashboard。

这个项目更适合：

```text
Editorial
Literary
Museum
Archive
Book
Art Direction
```

关键词应该是：

> **Editorial + Paper + Cinematic + Minimal**

---

# 三十七、颜色系统

我会先做一个：

### Warm Ivory

```text
Background
#E9E4DA

Paper
#F8F4EA

Ink
#24211C

Secondary
#777066

Border
#D6CEC0
```

再提供：

### Midnight

```text
Background
#11110F

Paper
#1D1C19

Ink
#E8E1D5

Secondary
#918A7D
```

---

# 三十八、Markdown 支持的内容

建议第一版支持：

```text
# Heading

## Heading

paragraph

**bold**

*italic*

> quote

- list

1. list

![image](...)

[link](...)

---

code
```

但更值得做的是几个自定义语法：

```md
:::quote
有些故事，
不是被讲出来的，
而是被记住的。
:::
```

以及：

```md
:::image
src: ./images/moon.jpg
caption: 月亮第一次升起的时候
:::
```

以后可以做：

```md
:::scene
...
:::

:::poem
...
:::

:::chapter
...
:::
```

---

# 三十九、图片不要简单 `<img>`

图片应该有 Storybook 专属视觉：

```text
┌─────────────────────────────┐
│                             │
│                             │
│          IMAGE              │
│                             │
│                             │
└─────────────────────────────┘

         Moon over Forest
```

支持：

```text
full bleed
center
small
left
right
caption
```

例如：

```md
![moon](./moon.jpg)
```

默认居中。

如果 frontmatter：

```yaml
imageStyle: full
```

则：

```text
┌──────────────────────────────┐
│                              │
│         FULL BLEED           │
│                              │
└──────────────────────────────┘
```

---

# 四十、进一步做“章节开场页”

非常漂亮。

每个故事开始：

```text
                CHAPTER III


                   狐狸


              THE FOX IN THE RAIN


                   ✦
```

然后下一页才开始正文。

所以：

```text
Story
├── Chapter Cover
├── Content
├── Content
├── Content
└── Chapter Ending
```

这样书的质感会比“直接 Markdown 渲染”好非常多。

---

# 四十一、故事结尾页

例如：

```text
                         ·


                  END OF STORY


                    狐狸


              The next story awaits.


                     ↓


                   河流
```

下一次翻页：

```text
NEXT STORY
```

这样自然进入下一个故事。

---

# 四十二、我建议加入一个非常轻的“Story Map”

在阅读中点击：

```text
⌘ K
```

或者：

```text
Story Map
```

出现全屏：

```text
                 YOUR STORY


                     ●
                    / \
                   /   \
                  /     \
                ●         ●
              森林       城市
             / | \        |
            ●  ●  ●       ●
           月  河  狐     夜
```

点击节点：

```text
preview
```

右边：

```text
┌──────────────────────┐
│                      │
│        月亮          │
│                      │
│   Chapter 01         │
│                      │
│   一段简短摘要……     │
│                      │
│     OPEN STORY →     │
│                      │
└──────────────────────┘
```

这会成为整个产品非常有辨识度的功能。

---

# 四十三、Search 也可以自然加入

不是传统搜索框。

快捷键：

```text
⌘ K
```

然后：

```text
Search stories...

moon
```

结果：

```text
Stories

01  月亮落进森林
    "月亮从树梢升起……"

07  河流
    "月光映在河面……"
```

点击直接定位故事。

---

# 四十四、一个重要的技术取舍：不要过度依赖 UI Framework

我不建议这个项目：

```text
Element Plus
```

作为主要 UI。

因为你需要的不是：

```text
Table
Form
Dialog
Dropdown
```

而是：

```text
Book
Paper
Tree
Map
Animation
Typography
```

建议：

```text
Vue 3
+
TypeScript
+
Pinia
+
Vue Router
+
page-flip
+
markdown-it
+
Shiki
+
自定义 CSS
```

最多再引入：

```text
VueUse
```

提供一些 composables。

**UI 本身自己设计。**

---

# 四十五、Story Map 可以复用 Vue Flow，但要“去 Flow 化”

Vue Flow 很适合处理：

```text
zoom
pan
nodes
edges
viewport
```

而你的：

```text
StoryNode
StoryEdge
StoryMap
```

全部自己画。

所以：

```text
Vue Flow
   ↓
基础图引擎

StoryMap
   ↓
你的视觉设计
```

而不是直接拿 Vue Flow 默认样式。

---

# 四十六、推荐技术栈最终版

| 层           | 技术                              |
| ----------- | ------------------------------- |
| Framework   | Vue 3                           |
| Language    | TypeScript                      |
| Build       | Vite                            |
| State       | Pinia                           |
| Router      | Vue Router                      |
| Markdown    | markdown-it                     |
| Frontmatter | gray-matter / 自实现轻量 parser      |
| Code        | Shiki                           |
| Book Flip   | page-flip / StPageFlip          |
| Story Map   | Vue Flow                        |
| Icons       | Font Awesome / Lucide           |
| Utility     | VueUse                          |
| Font        | Noto Serif + Cormorant Garamond |
| Storage     | localStorage                    |
| Animation   | CSS + Web Animations API        |

其中 `page-flip` 的 HTML 页面能力尤其适合这个场景；而 Shiki 本身是基于 TextMate grammar 的高质量 syntax highlighter。([GitHub][2])

---

# 四十七、MVP 我建议不要一开始做太多

第一版只做：

```text
P0
├── Markdown Loader
├── Frontmatter
├── Story Tree
├── Markdown Renderer
├── Image
├── Book Cover
├── Index
├── Page Flip
├── Story Navigation
├── Progress
└── Responsive
```

也就是：

```text
stories/*.md
      ↓
自动发现
      ↓
自动目录
      ↓
自动故事树
      ↓
漂亮电子书
```

**这个版本已经足够形成完整产品。**

---

# 四十八、第二阶段

再做：

```text
P1
├── Story Map
├── Search
├── Resume Reading
├── Dark Mode
├── Font Size
├── Reading Progress
├── Keyboard
└── Mobile Gesture
```

---

# 四十九、第三阶段才做高级能力

```text
P2
├── Story Relationship
├── Non-linear Navigation
├── Related Stories
├── Cross References
├── Bookmarks
├── Notes
├── Highlights
└── Reading Statistics
```

---

# 五十、最终我建议把它定义成这样的产品

不是：

> Markdown Viewer

也不是：

> Flip Book

而是：

# **Storybook Engine**

```text
                     STORYBOOK
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       CONTENT          TREE           BOOK
          │              │              │
       Markdown       Story Map      Page Flip
          │              │              │
       Images         Relations       Reader
          │              │              │
          └──────────────┼──────────────┘
                         │
                   Reading State
                         │
                  Local Persistence
```

这样架构的好处是，**Markdown 只是内容格式，而不是整个系统的架构核心**。

以后你甚至可以把：

```text
stories/
```

替换成：

```text
AI generated stories
remote stories
database
Git repository
CMS
```

而 Book Engine 完全不需要改变。

---

## 我最推荐的最终 UX 流程

```text
                    ┌──────────────┐
                    │              │
                    │    COVER     │
                    │              │
                    │  STORY BOOK  │
                    │              │
                    └──────┬───────┘
                           │
                         OPEN
                           ↓
                    ┌──────────────┐
                    │   CONTENTS   │
                    │              │
                    │   故事树      │
                    │              │
                    └──────┬───────┘
                           │
                     select story
                           ↓
                  ┌─────────────────┐
                  │                 │
                  │  STORY COVER    │
                  │                 │
                  │     月亮        │
                  │                 │
                  └────────┬────────┘
                           │
                        flip
                           ↓
              ┌─────────────────────────┐
              │                         │
              │       CONTENT           │
              │                         │
              │       很久以前……       │
              │                         │
              │           17            │
              │                         │
              └─────────────────────────┘
                           │
                     flip / swipe
                           ↓
                        ...
                           ↓
                  ┌─────────────────┐
                  │                 │
                  │   STORY END     │
                  │                 │
                  │   next story →  │
                  │                 │
                  └────────┬────────┘
                           │
                           ↓
                      STORY TREE
                           │
                    ┌──────┴──────┐
                    ↓             ↓
                  河流           狐狸
                    │             │
                    └──────┬──────┘
                           ↓
                       NEW STORY
```

**如果按这个方向做，我会把“视觉重点”放在三个地方：`Book Cover → Story Map → Paper/Page`。** 这三个地方决定了产品有没有设计感；Markdown parser、Pinia、Vite 这些只是基础设施，不能让它们主导 UI。

另外一个关键点是：**不要让 `page-flip` 决定你的产品结构**。它只是底层的“纸张运动引擎”；`StoryDocument → StoryTree → BookPage → ReaderState` 才应该是你自己的核心架构。这样以后即使换掉翻页库，整个 Storybook 仍然成立。

[1]: https://github.com/antfu/vite-plugin-md?utm_source=chatgpt.com "GitHub - antfu/vite-plugin-md: Markdown with Vue for Vite"
[2]: https://github.com/Nodlik/StPageFlip/blob/master/README.md?utm_source=chatgpt.com "StPageFlip/README.md at master · Nodlik/StPageFlip · GitHub"
[3]: https://github.com/ts1/flipbook-vue?utm_source=chatgpt.com "GitHub - ts1/flipbook-vue: 3D page flip effect for Vue.js · GitHub"
[4]: https://github.com/bcakmakoglu/vue-flow?utm_source=chatgpt.com "GitHub - bcakmakoglu/vue-flow: A highly customizable Flowchart component for Vue 3. Features seamless zoom & pan 🔎, additional components like a Minimap 🗺 and utilities to interact with state and graph. · GitHub"
