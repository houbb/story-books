# 004 · 纯 Web 能力增强 · 美观 · 交互改进（优先级排序）

> 定位：不引入后端、不引入登录，全部能力在浏览器内闭环（localStorage / IndexedDB / 原生 Web API），保持 GitHub Pages 静态部署。
> 用户画像：**不懂技术的普通教师** —— 一切功能必须"点开就会用，零配置"。

---

## 一、现状盘点（v0.3.0）

已有：翻书阅读器（page-flip）、故事地图、字数汇总、全文检索（⌘K）、字体/字号/主题设置、继续阅读、环境配乐、GitHub Pages 自动部署。

已具备的良好底座：`StorySource / WordCounter / StorySearchEngine / Compaction 式` 接口优先 + 策略模式骨架，新功能都应沿用同一套 SPI 铺法。

---

## 二、代码审计发现的真实缺口（证据）

| # | 缺口 | 证据 |
|---|------|------|
| A1 | **长文截断风险**：每篇故事只产出 1 个 content 页，`.content-page__body { overflow: hidden }`，字号 19px 或长文时正文会被裁掉 | `BookPaginator.ts`（每 story 一个 content 页）+ `page.css` content 区 |
| A2 | **阅读历史无 UI**：`settings.history`（最多 50 条）持久化了，但没有任何页面消费 | `stores/settings.ts:99-107` |
| A3 | **无自动夜间**：theme 只有手动 light/night，不响应 `prefers-color-scheme` | grep 无结果 |
| A4 | **无减弱动效适配**：不响应 `prefers-reduced-motion`（翻页动画 + 12 处 keyframes） | grep 无结果 |
| A5 | **字体全走 CDN**：霞鹜文楷/Inter 断网或墙内加载慢时整站退化为系统字体，无 preload / font-display 兜底 | `index.html:20-27` |
| A6 | **Chrome 常驻**：顶栏/底栏 fixed 常显，无沉浸阅读（点击隐藏） | `ReaderChrome.vue:97-104` |
| A7 | **翻页只有按钮/键盘**：无左右半屏点击热区（教师用平板/触屏时最自然的动作） | `Reader.vue` onKey 无 click 分区 |
| A8 | **minimap/controls/background 已安装未用满** | package.json vs `StoryMap.vue` |

---

## 三、优先级总表

> P0 = 伤害核心体验，先修先做 ｜ P1 = 高频增值 ｜ P2 = 锦上添花

| 优先级 | 编号 | 能力 | 类型 | 成本 |
|---|---|---|---|---|
| **P0** | F1 | 长文自动分页修复（含单测 + E2E） | 核心正确性 | 中 |
| **P0** | F2 | 书签 + 阅读进度分章可视化 | 核心能力 | 中 |
| **P0** | F3 | 沉浸模式（tap 隐藏 chrome + 左右热区翻页） | 交互 | 小 |
| **P1** | F4 | 朗读 TTS（SpeechSynthesis，接口可替换） | 能力增强 | 中 |
| **P1** | F5 | "我的书房"页：阅读历史 + 书签 + 进度（消费 A2 数据） | 核心能力 | 中 |
| **P1** | F6 | 划线/批注（IndexedDB，选中文字即存） | 核心能力 | 中大 |
| **P1** | F7 | 自动夜间（`auto` 主题第三态）+ 减弱动效适配 | 美观/无障碍 | 小 |
| **P1** | F8 | 分享：故事深链 + 金句引用卡片（Canvas 导出） | 能力增强 | 中 |
| **P2** | F9 | PWA：manifest + Service Worker 离线（字体本地子集化） | 能力增强 | 中 |
| **P2** | F10 | 翻页音效（WebAudio，静音开关旁） | 交互 | 小 |
| **P2** | F11 | 导出单篇 PDF（print stylesheet） | 能力增强 | 小 |
| **P2** | F12 | 检索增强：文内命中高亮 + 搜索历史 + 拼音首字母 | 交互 | 中 |
| **P2** | F13 | 故事地图增强：已读/未读节点着色 + minimap 落地 | 美观 | 小 |
| **P2** | F14 | 阅读进度条升级：预计剩余时间 + 章节刻度 | 交互 | 小 |

---

## 四、功能详细设计

### P0 — 先做，直接影响"这本书能不能好好读"

#### F1 · 长文自动分页修复 ⚠️ 疑似缺陷，第一步先复现

- **问题**：分页器每篇故事只给一个 content 页；page.css 里 `.content-page__body` 是 `overflow:hidden`。当故事偏长（>800 字）、字号选 19、或窗口矮时，正文尾部会被无声裁掉。
- **成功标准（可验证）**：新增 E2E —— 把某篇故事临时加长到 3 页 + 字号 XL + 小窗口，断言全部文字可见（无 clipped 文本）。
- **方案**（接口优先）：
  1. 定义 `PageBreakStrategy` 接口：`split(storyHtml, pageSize) → PageSlice[]`；默认实现 `HeightMeasureBreaker`（隐藏容器实测高度、按段落/句子边界切分，不把段落劈成半截）。
  2. `BookPaginator` 消费该接口，不再硬编码 1 story = 1 content 页；`storyId + sliceIndex` 保证页 id 稳定，继续阅读不受影响。
  3. 字号/字体切换后 debounce 重排（现有 settings 已广播 data-* 属性，加一个 MutationObserver 或 settings watch 即可）。
- **风险**：page-flip 的 `loadFromHTML` 自会切高块，但和我们的 `height:100% + overflow:hidden` 样式冲突。**先做 30 分钟复现验证再动手**，若 page-flip 原生化切分已可用，则只改 CSS（改动量降到 20 行）。

#### F2 · 书签 + 分章进度

- **用户价值**：教师读到一半想"明天从这里继续、这一页讲课时要用"→ 一个 ⚑ 按钮解决。
- **接口**：`BookmarkStorage { list/add/remove }`，默认 `LocalStorageBookmarkStorage`（沿用 settings store 的 save 模式）。键含 `storyId + page + 摘句前 40 字`。
- **UI**：
  - 顶栏加 ⚑ 按钮（Apple pill 风格），点亮/取消带 200ms 弹性动画；
  - 目录页每篇故事后显示进度点（●●○○）；
  - 故事封面右下角显示"已读到 60%"。
- **验收**：E2E 加书签 → 刷新 → 书房页可见 → 点击直达对应页。

#### F3 · 沉浸模式 + 触屏热区

- **改动**：
  - 点击画面中央 50% 区域 → chrome 淡出（`opacity + pointer-events` 过渡），点击边缘 25%/25% → 后翻/前翻；底栏保留 2px 细进度线常显（进度感不丢失）。
  - 移动端：底部改为单行极简（☰ 地图 / ⚑ / Aa 三个 icon）。
- **成本**：仅 `ReaderChrome.vue` + `Reader.vue`，~80 行。
- **验收**：E2E 断言点击中央后 `chrome__top` opacity=0；点右 1/4 页码 +1。

---

### P1 — 高频增值，让"纯 Web"显得不像网页而像 App

#### F4 · 朗读 TTS

- **接口**：`Narrator { speak(text, opts) / pause / stop / onEnd }`，默认 `WebSpeechNarrator`（`speechSynthesis`，中文音色优选 Xiaoxiao/Yunxi，找不到降级默认 zh 音色）。
- **交互**：Chrome 上加"▶ 朗读"胶囊按钮 → 进入自动朗读 + 自动翻页（读完一页 `onend` 后 `flipNext()`，与 F1 分页天然衔接）；再点停止。
- **降级**：不支持 `speechSynthesis` 的浏览器隐藏按钮（feature detect，不报错）。
- **验收**：单测 mock SpeechSynthesisUtterance 验证切页时机；E2E 验证按钮状态机。

#### F5 · "我的书房"（/shelf）

- **动机**：`history` 数据已在 localStorage 里睡觉（A2）；书签（F2）、阅读足迹（累计天数/时长）都汇入这一页。
- **UI**：延续 Home 的编辑部风格 —— 顶部 Hero"你已经在这座花园走了 N 天"，下面是故事卡片流（封面色块 + 进度环 + 最后阅读时间 + ⚑ 数量），空状态画一颗种子。
- **路由**：`/shelf`，Home 快捷入口第四张卡。

#### F6 · 划线 / 批注

- **接口**：`AnnotationStorage { byStory(id) / save / remove }`，默认 IndexedDB（idb-keyval 级别即可，不引大依赖）。
- **实现要点**：选中正文 → 浮动"✎ 收藏/批注"小卡（复用 SearchView 的 mark 配色）→ 按 `故事 + 段落序号 + 文本偏移` 定位；渲染时回灌 `<mark class="annot">`。
- **注意**：与 page-flip 的 interaction 冲突需在页面上 stopPropagation，本项最大风险点，先做 PoC。

#### F7 · 自动夜间 + 减弱动效

- `ThemeMode` 增加 `'auto'`：跟随 `prefers-color-scheme` 并监听变化；SettingsPanel 主题段变成 日间/夜间/自动 三档（现在是 Home 顶栏一个 ☾ 按钮，一并挪进 SettingsPanel）。
- `@media (prefers-reduced-motion: reduce)` 全局：翻页 `flippingTime→0`、keyframes 全部 `animation:none`。~30 行 CSS + 10 行 JS。

#### F8 · 分享与金句卡片

- 故事深链已有（`?story=`），补一个"分享此篇"按钮：`navigator.share` 可用则原生分享，否则复制 URL 到剪贴板 + toast。
- 金句卡片：长按/选中 → "生成卡片" → Canvas 按当前主题/字体绘制 800×1000 卡片 → 下载 PNG。教师转发微信群的核心场景。

---

### P2 — 锦上添花，按兴趣排期

| 项 | 一句话方案 |
|---|---|
| **F9 PWA** | `@vite-plugin/pwa`（workbox）+ manifest，可安装到桌面；霞鹜文楷子集化后放 `public/fonts`，解决 A5 断网裸奔 |
| **F10 翻页音效** | WebAudio 合成纸声（白噪声包络，不用素材文件），跟随现有 soundEnabled 开关 |
| **F11 导出 PDF** | `@media print` 样式 + `window.print()`，单篇故事一页一张纸，去掉 chrome |
| **F12 检索增强** | 跳转进阅读页后 `?q=` 命中文本自动 `<mark>`；搜索框下拉显示最近 8 条历史；CJK 拼音首字母（如 `yx` → 月亮）用 2KB 映射表 |
| **F13 地图增强** | 已读节点亮 + 描边、未读半透明；把已安装的 `@vue-flow/minimap/controls` 挂上 |
| **F14 进度升级** | 底栏进度条加章节刻度点 + "约剩 3 分钟"（WordCounter 已有字数，按 400 字/分钟估算） |

---

## 五、建议实施波次

```
Wave 1（正确性周）: F1 → F3 → F7          —— 小改动、纯前端、当天可验
Wave 2（留存周）  : F2 → F5                —— 书签数据模型先行，书房页直接消费
Wave 3（增值周）  : F4 → F8                —— TTS + 分享，教师场景传播闭环
Wave 4（打磨周）  : F6 → F9~F14            —— 批注 PoC 通过再做，其余并行
```

每波结束跑四步验证（vitest / vue-tsc / vite build / playwright），新增能力全部补对应 E2E。

## 六、设计原则对齐检查

- 每项均先定义 SPI 接口（`PageBreakStrategy / BookmarkStorage / Narrator / AnnotationStorage`），默认实现可被插件替换 ✅
- 无新依赖优先用原生 API（SpeechSynthesis / IndexedDB / Canvas / share）✅
- 全部纯 Web、静态托管可跑，不违背 001 的 Pages 部署 ✅

## 七、待帅哥拍板的未知项

1. **F1 若复现后发现 page-flip 原生切分可用**，接受"只改 CSS 不写 Breaker 接口"的最小方案吗？（省 2 天）
2. **批注（F6）** 做"仅收藏金句"还是"自由文本批注"？前者工作量减半。
3. 目标版本号：Wave 1-2 合入后按 **0.4.0** 发 CHANGELOG？
