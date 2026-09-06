<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import SettingsPanel from '@/components/reader/SettingsPanel.vue';
import ChapterTocDrawer from '@/components/reader/ChapterTocDrawer.vue';
import { bookmarkStorage } from '@/core/book/BookmarkStorage';
import { webSpeechNarrator } from '@/core/narrator/Narrator';
import { QuoteCardGenerator } from '@/core/share/QuoteCardGenerator';

const props = withDefaults(
  defineProps<{
    pageCount: number;
    musicPlaying: boolean;
    visible?: boolean;
    storyId?: string | null;
    storyTitle?: string;
    pageTitle?: string;
    pageSnippet?: string;
    pageAnchor?: string;
    sliceIndex?: number;
    shareUrl?: string;
    quote?: string;
  }>(),
  {
    visible: true,
    storyId: null,
    storyTitle: '',
    pageTitle: '',
    pageSnippet: '',
    pageAnchor: '',
    sliceIndex: 0,
    shareUrl: '',
    quote: '',
  }
);

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'exit'): void;
  (e: 'toggle-music'): void;
  (e: 'share'): void;
  (e: 'quote-card'): void;
  (e: 'toggle-collapse'): void;
}>();

const book = useBookStore();
const router = useRouter();

const showSettings = ref(false);
const showTocDrawer = ref(false);
const showMoreMenu = ref(false);
const speaking = ref(false);

const bookmarked = computed(() =>
  props.storyId ? bookmarkStorage.has(props.storyId, book.currentPage, props.sliceIndex) : false
);

function toggleBookmark() {
  if (!props.storyId) return;
  const found = bookmarkStorage
    .list()
    .find(
      (item) =>
        item.storyId === props.storyId &&
        item.page === book.currentPage &&
        item.sliceIndex === props.sliceIndex
    );
  if (found) bookmarkStorage.remove(found.id);
  else
    bookmarkStorage.add({
      storyId: props.storyId,
      page: book.currentPage,
      sliceIndex: props.sliceIndex,
      anchor: props.pageAnchor,
      title: props.storyTitle || props.pageTitle,
      snippet: props.pageSnippet,
    });
}

async function toggleNarration() {
  if (speaking.value) {
    webSpeechNarrator.stop();
    speaking.value = false;
    return;
  }
  speaking.value = true;
  await webSpeechNarrator.speak(props.quote || props.pageSnippet);
  speaking.value = false;
}

async function share() {
  emit('share');
  showMoreMenu.value = false;
  const url = props.shareUrl || window.location.href;
  if (navigator.share) await navigator.share({ title: props.storyTitle, url }).catch(() => undefined);
  else {
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
  }
}

async function makeQuoteCard() {
  emit('quote-card');
  showMoreMenu.value = false;
  if (props.quote && props.storyTitle)
    await QuoteCardGenerator.downloadCard({ quote: props.quote, storyTitle: props.storyTitle });
}

const pageInfo = computed(() => {
  const n = book.currentPage + 1;
  const total = props.pageCount;
  return { n, total, ratio: total ? n / total : 0 };
});

function openMap() {
  showMoreMenu.value = false;
  router.push('/map');
}

function openSearch() {
  showMoreMenu.value = false;
  router.push('/search');
}

function openStats() {
  showMoreMenu.value = false;
  router.push('/stats');
}

function onSelectChapter(page: number) {
  window.dispatchEvent(new CustomEvent('storybook:goto', { detail: { page } }));
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.chrome__more-wrapper')) {
    showMoreMenu.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div>
    <!-- Collapsed floating trigger capsule (shown when chrome is hidden/collapsed) -->
    <div
      class="chrome-pill"
      :class="{ 'is-visible': visible === false }"
      @click="emit('toggle-collapse')"
      title="展开控制栏"
    >
      <span class="chrome-pill__icon">✦</span>
      <span class="chrome-pill__label">控制栏</span>
    </div>

    <div class="chrome" :class="{ 'is-hidden': visible === false }">
      <header class="chrome__top">
        <div class="chrome__top-left">
          <button class="chrome__icon" title="退出 (Esc)" @click="emit('exit')">
            <span>←</span>
          </button>
          <span class="chrome__brand">The Story Garden</span>
        </div>

        <div class="chrome__top-actions">
          <!-- 核心高频操作 1：目录选择器 (新工具) -->
          <button
            class="chrome__icon chrome__icon--highlight chrome__icon--label"
            title="查看章节目录"
            @click="showTocDrawer = true"
          >
            <span class="chrome__icon-glyph">📖</span>
            <span class="chrome__icon-label-text">目录</span>
          </button>

          <!-- 核心高频操作 2：阅读偏好设置 -->
          <button
            class="chrome__icon chrome__icon--label"
            title="阅读偏好"
            @click="showSettings = !showSettings"
          >
            <span class="chrome__icon-glyph">Aa</span>
            <span class="chrome__icon-label-text">设置</span>
          </button>

          <!-- 桌面端操作：配乐 -->
          <button
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            :title="musicPlaying ? '暂停配乐' : '播放配乐'"
            @click="emit('toggle-music')"
          >
            <span class="chrome__music-bars" :class="{ 'is-playing': musicPlaying }">
              <i /><i /><i />
            </span>
            <span class="chrome__icon-label-text">{{ musicPlaying ? '配乐' : '静音' }}</span>
          </button>

          <!-- 桌面端操作：检索 -->
          <button
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            title="搜索 (⌘K)"
            @click="openSearch"
          >
            <span class="chrome__icon-glyph">⌕</span>
            <span class="chrome__icon-label-text">检索</span>
          </button>

          <!-- 桌面端操作：书签 -->
          <button
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            :disabled="!storyId"
            :title="bookmarked ? '取消书签' : '添加书签'"
            @click="toggleBookmark"
          >
            <span class="chrome__icon-glyph">{{ bookmarked ? '⚑' : '⚐' }}</span>
            <span class="chrome__icon-label-text">书签</span>
          </button>

          <!-- 桌面端操作：朗读 -->
          <button
            v-if="storyId"
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            title="朗读当前页"
            @click="toggleNarration"
          >
            <span class="chrome__icon-glyph">{{ speaking ? '■' : '▶' }}</span>
            <span class="chrome__icon-label-text">{{ speaking ? '停止' : '朗读' }}</span>
          </button>

          <!-- 桌面端操作：故事地图 -->
          <button
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            title="故事地图 (⌘M)"
            @click="openMap"
          >
            <span class="chrome__icon-glyph">🗺</span>
            <span class="chrome__icon-label-text">地图</span>
          </button>

          <!-- 桌面端操作：字数统计 -->
          <button
            class="chrome__icon chrome__icon--label chrome-desktop-only"
            title="字数汇总"
            @click="openStats"
          >
            <span class="chrome__icon-glyph">∑</span>
            <span class="chrome__icon-label-text">字数</span>
          </button>

          <!-- 更多操作下拉菜单（移动端智能收纳 + 沉浸全屏入口） -->
          <div class="chrome__more-wrapper">
            <button
              class="chrome__icon chrome__icon--label"
              :class="{ 'is-active': showMoreMenu }"
              title="更多工具"
              @click.stop="showMoreMenu = !showMoreMenu"
            >
              <span class="chrome__icon-glyph">⋯</span>
              <span class="chrome__icon-label-text chrome-mobile-hide">更多</span>
            </button>

            <div v-if="showMoreMenu" class="chrome__menu" @click.stop>
              <!-- 沉浸阅读全屏切换 -->
              <button class="chrome__menu-item" @click="emit('toggle-collapse')">
                <span class="chrome__menu-icon">⛶</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">沉浸全屏阅读</span>
                  <span class="chrome__menu-desc">隐藏工具栏，纯净翻页</span>
                </div>
              </button>

              <div class="chrome__menu-divider" />

              <!-- 移动端优先呈现的辅助工具 -->
              <button class="chrome__menu-item chrome-mobile-only-flex" @click="emit('toggle-music')">
                <span class="chrome__menu-icon">{{ musicPlaying ? '⏸' : '🎵' }}</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">{{ musicPlaying ? '暂停配乐' : '背景配乐' }}</span>
                </div>
              </button>

              <button class="chrome__menu-item chrome-mobile-only-flex" @click="openSearch">
                <span class="chrome__menu-icon">⌕</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">全书检索</span>
                </div>
              </button>

              <button
                v-if="storyId"
                class="chrome__menu-item chrome-mobile-only-flex"
                @click="toggleBookmark"
              >
                <span class="chrome__menu-icon">{{ bookmarked ? '⚑' : '⚐' }}</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">{{ bookmarked ? '取消书签' : '添加书签' }}</span>
                </div>
              </button>

              <button
                v-if="storyId"
                class="chrome__menu-item chrome-mobile-only-flex"
                @click="toggleNarration"
              >
                <span class="chrome__menu-icon">{{ speaking ? '■' : '▶' }}</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">{{ speaking ? '停止朗读' : '朗读正文' }}</span>
                </div>
              </button>

              <button class="chrome__menu-item chrome-mobile-only-flex" @click="openMap">
                <span class="chrome__menu-icon">🗺</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">故事地图</span>
                </div>
              </button>

              <button class="chrome__menu-item chrome-mobile-only-flex" @click="openStats">
                <span class="chrome__menu-icon">∑</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">字数统计</span>
                </div>
              </button>

              <div class="chrome__menu-divider chrome-mobile-only-flex" />

              <!-- 分享与金句卡片 -->
              <button v-if="storyId" class="chrome__menu-item" @click="share">
                <span class="chrome__menu-icon">↗</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">分享章节</span>
                </div>
              </button>

              <button v-if="quote && storyId" class="chrome__menu-item" @click="makeQuoteCard">
                <span class="chrome__menu-icon">▧</span>
                <div class="chrome__menu-text">
                  <span class="chrome__menu-title">生成金句卡片</span>
                </div>
              </button>
            </div>
          </div>

          <!-- 一键折叠沉浸式阅读按钮 -->
          <button
            class="chrome__icon chrome__icon--collapse"
            title="折叠工具栏 (沉浸阅读)"
            @click="emit('toggle-collapse')"
          >
            <span>⌃</span>
          </button>
        </div>
      </header>

      <footer class="chrome__bottom">
        <button class="chrome__nav" :disabled="book.currentPage <= 0" @click="emit('prev')">
          <span class="chrome__nav-arrow">←</span>
          <span class="chrome__nav-label">previous</span>
        </button>
        <div class="chrome__progress">
          <div class="chrome__progress-bar">
            <div class="chrome__progress-fill" :style="{ width: `${pageInfo.ratio * 100}%` }" />
          </div>
          <span class="chrome__progress-text">
            <span class="chrome__progress-num">{{ pageInfo.n }}</span>
            <span class="chrome__progress-sep">/</span>
            <span class="chrome__progress-total">{{ pageInfo.total }}</span>
          </span>
        </div>
        <button
          class="chrome__nav"
          :disabled="book.currentPage >= pageCount - 1"
          @click="emit('next')"
        >
          <span class="chrome__nav-label">next</span>
          <span class="chrome__nav-arrow">→</span>
        </button>
      </footer>

      <!-- 阅读偏好弹窗 -->
      <transition name="settings">
        <div
          v-if="showSettings"
          class="chrome__settings-mask"
          @click.self="showSettings = false"
        >
          <SettingsPanel @close="showSettings = false" />
        </div>
      </transition>

      <!-- 快速章节目录抽屉 -->
      <transition name="drawer">
        <div
          v-if="showTocDrawer"
          class="chrome__settings-mask"
          @click.self="showTocDrawer = false"
        >
          <ChapterTocDrawer
            @close="showTocDrawer = false"
            @select="onSelectChapter"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* 悬浮小胶囊 (全屏沉浸时显示) */
.chrome-pill {
  position: fixed;
  top: calc(14px + env(safe-area-inset-top));
  right: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow);
  color: var(--ink-soft);
  font-size: 12px;
  cursor: pointer;
  z-index: 90;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}
.chrome-pill:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.chrome-pill.is-visible {
  opacity: 0.92;
  pointer-events: auto;
  transform: translateY(0);
}
.chrome-pill__icon {
  font-size: 11px;
  color: var(--accent);
}
.chrome-pill__label {
  font-family: var(--font-serif-cn);
  letter-spacing: 0.08em;
}

.chrome {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
  z-index: 80;
}
.chrome > * {
  pointer-events: auto;
}
.chrome.is-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
}
.chrome__top,
.chrome__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(16px + env(safe-area-inset-top)) 24px 16px;
  color: var(--muted);
}
.chrome__top-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.chrome__top {
  background: linear-gradient(to bottom, var(--bg-base) 60%, transparent);
}
.chrome__bottom {
  background: linear-gradient(to top, var(--bg-base) 60%, transparent);
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  gap: 24px;
}
.chrome__top-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}
.chrome__brand {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--muted);
}
.chrome__icon {
  height: 36px;
  min-width: 36px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  color: var(--ink-soft);
  background: var(--bg-paper);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-fine);
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.chrome__icon:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
  border-color: var(--accent-soft);
}
.chrome__icon--highlight {
  background: var(--accent-bg);
  border-color: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}
.chrome__icon--collapse {
  padding: 0;
  width: 34px;
  height: 34px;
  font-size: 13px;
}
.chrome__icon-glyph {
  font-size: 14px;
  line-height: 1;
}
.chrome__icon-label-text {
  font-family: var(--font-serif-cn);
  font-size: 12px;
  letter-spacing: 0.05em;
}
.chrome__music-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}
.chrome__music-bars i {
  display: block;
  width: 2px;
  height: 5px;
  border-radius: 2px;
  background: currentColor;
}
.chrome__music-bars.is-playing i:nth-child(1) {
  animation: music-bar 700ms ease-in-out infinite alternate;
}
.chrome__music-bars.is-playing i:nth-child(2) {
  animation: music-bar 700ms 180ms ease-in-out infinite alternate;
}
.chrome__music-bars.is-playing i:nth-child(3) {
  animation: music-bar 700ms 340ms ease-in-out infinite alternate;
}
@keyframes music-bar {
  to {
    height: 12px;
  }
}

/* 更多功能下拉浮层 */
.chrome__more-wrapper {
  position: relative;
}
.chrome__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 210px;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-deep);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  animation: fade-up var(--dur-fast) var(--ease-out);
}
.chrome__menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  width: 100%;
  text-align: left;
  transition: background var(--dur-fast) var(--ease-out);
}
.chrome__menu-item:hover {
  background: var(--bg-secondary);
}
.chrome__menu-icon {
  font-size: 14px;
  color: var(--accent);
  width: 20px;
  text-align: center;
}
.chrome__menu-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.chrome__menu-title {
  font-family: var(--font-serif-cn);
  font-size: 13px;
  color: var(--ink);
}
.chrome__menu-desc {
  font-size: 10px;
  color: var(--muted);
}
.chrome__menu-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 6px;
}

/* 底部翻页与进度 */
.chrome__nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--ink-soft);
  background: var(--bg-paper);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-fine);
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}
.chrome__nav:hover:not(:disabled) {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.chrome__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.chrome__nav-arrow {
  font-size: 15px;
}
.chrome__progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  max-width: 320px;
}
.chrome__progress-bar {
  width: 100%;
  height: 3px;
  background: var(--border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.chrome__progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-fast) var(--ease-out);
}
.chrome__progress-text {
  font-family: var(--font-serif-en);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--muted);
}

.chrome__settings-mask {
  position: fixed;
  inset: 0;
  background: var(--overlay-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  padding: 16px;
}

/* 响应式样式 */
.chrome-mobile-only-flex {
  display: none;
}

@media (max-width: 720px) {
  .chrome__top,
  .chrome__bottom {
    padding: calc(10px + env(safe-area-inset-top)) 12px 10px;
  }
  .chrome__brand {
    display: none;
  }
  .chrome-desktop-only {
    display: none !important;
  }
  .chrome-mobile-only-flex {
    display: flex !important;
  }
  .chrome-mobile-hide {
    display: none !important;
  }
  .chrome__top-actions {
    gap: 4px;
  }
  .chrome__icon {
    height: 34px;
    padding: 0 8px;
  }
  .chrome__bottom {
    gap: 12px;
  }
  .chrome__nav {
    padding: 6px 10px;
    font-size: 11px;
  }
  .chrome__nav-label {
    display: none;
  }
}
</style>
