<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import SettingsPanel from '@/components/reader/SettingsPanel.vue';
import { bookmarkStorage } from '@/core/book/BookmarkStorage';
import { webSpeechNarrator } from '@/core/narrator/Narrator';
import { QuoteCardGenerator } from '@/core/share/QuoteCardGenerator';

const props = withDefaults(defineProps<{
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
}>(), { visible: true, storyId: null, storyTitle: '', pageTitle: '', pageSnippet: '', pageAnchor: '', sliceIndex: 0, shareUrl: '', quote: '' });
const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'exit'): void;
  (e: 'toggle-music'): void;
  (e: 'share'): void;
  (e: 'quote-card'): void;
}>();

const bookmarked = computed(() => props.storyId ? bookmarkStorage.has(props.storyId, book.currentPage, props.sliceIndex) : false);
const speaking = ref(false);
function toggleBookmark() {
  if (!props.storyId) return;
  const found = bookmarkStorage.list().find((item) => item.storyId === props.storyId && item.page === book.currentPage && item.sliceIndex === props.sliceIndex);
  if (found) bookmarkStorage.remove(found.id);
  else bookmarkStorage.add({ storyId: props.storyId, page: book.currentPage, sliceIndex: props.sliceIndex, anchor: props.pageAnchor, title: props.storyTitle || props.pageTitle, snippet: props.pageSnippet });
}
async function toggleNarration() {
  if (speaking.value) { webSpeechNarrator.stop(); speaking.value = false; return; }
  speaking.value = true;
  await webSpeechNarrator.speak(props.quote || props.pageSnippet);
  speaking.value = false;
}
async function share() {
  emit('share');
  const url = props.shareUrl || window.location.href;
  if (navigator.share) await navigator.share({ title: props.storyTitle, url }).catch(() => undefined);
  else {
    try { await navigator.clipboard?.writeText(url); } catch { /* clipboard unavailable */ }
  }
}
async function makeQuoteCard() {
  emit('quote-card');
  if (props.quote && props.storyTitle) await QuoteCardGenerator.downloadCard({ quote: props.quote, storyTitle: props.storyTitle });
}

const book = useBookStore();
const router = useRouter();
const showSettings = ref(false);

const pageInfo = computed(() => {
  const n = book.currentPage + 1;
  const total = props.pageCount;
  return { n, total, ratio: total ? n / total : 0 };
});

function openMap() {
  router.push('/map');
}
function openSearch() {
  router.push('/search');
}
function openStats() {
  router.push('/stats');
}
</script>

<template>
  <div class="chrome" :class="{ 'is-hidden': visible === false }">
    <header class="chrome__top">
      <button class="chrome__icon" :title="'退出 (Esc)'" @click="emit('exit')">
        <span>←</span>
      </button>
      <span class="chrome__brand">The Story Garden</span>
      <div class="chrome__top-actions">
        <button class="chrome__icon chrome__icon--label" title="搜索 (⌘K)" @click="openSearch">
          <span class="chrome__icon-glyph">⌕</span>
          <span class="chrome__icon-label-text">检索</span>
        </button>
        <button class="chrome__icon chrome__icon--label" :title="musicPlaying ? '暂停配乐' : '播放配乐'" @click="emit('toggle-music')">
          <span class="chrome__music-bars" :class="{ 'is-playing': musicPlaying }"><i /><i /><i /></span>
          <span class="chrome__icon-label-text">{{ musicPlaying ? '配乐' : '静音' }}</span>
        </button>
        <button class="chrome__icon chrome__icon--label" :disabled="!storyId" :title="bookmarked ? '取消书签' : '添加书签'" @click="toggleBookmark">
          <span class="chrome__icon-glyph">{{ bookmarked ? '⚑' : '⚐' }}</span>
          <span class="chrome__icon-label-text">书签</span>
        </button>
        <button v-if="storyId" class="chrome__icon chrome__icon--label" title="朗读当前页" @click="toggleNarration">
          <span class="chrome__icon-glyph">{{ speaking ? '■' : '▶' }}</span>
          <span class="chrome__icon-label-text">{{ speaking ? '停止' : '朗读' }}</span>
        </button>
        <button v-if="storyId" class="chrome__icon chrome__icon--label" title="分享此篇" @click="share">
          <span class="chrome__icon-glyph">↗</span>
          <span class="chrome__icon-label-text">分享</span>
        </button>
        <button v-if="quote && storyId" class="chrome__icon chrome__icon--label" title="生成金句卡片" @click="makeQuoteCard">
          <span class="chrome__icon-glyph">▧</span>
          <span class="chrome__icon-label-text">金句</span>
        </button>
        <button class="chrome__icon chrome__icon--label" title="阅读偏好" @click="showSettings = !showSettings">
          <span class="chrome__icon-glyph">Aa</span>
          <span class="chrome__icon-label-text">设置</span>
        </button>

        <button class="chrome__icon chrome__icon--label" title="字数汇总" @click="openStats">
          <span class="chrome__icon-glyph">∑</span>
          <span class="chrome__icon-label-text">字数</span>
        </button>
        <button class="chrome__icon chrome__icon--label" title="故事地图 (⌘M)" @click="openMap">
          <span class="chrome__icon-glyph">☰</span>
          <span class="chrome__icon-label-text">地图</span>
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
      <button class="chrome__nav" :disabled="book.currentPage >= pageCount - 1" @click="emit('next')">
        <span class="chrome__nav-label">next</span>
        <span class="chrome__nav-arrow">→</span>
      </button>
    </footer>

    <transition name="settings">
      <div v-if="showSettings" class="chrome__settings-mask" @click.self="showSettings = false">
        <SettingsPanel @close="showSettings = false" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.chrome {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.chrome > * {
  pointer-events: auto;
}
.chrome.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.chrome__top,
.chrome__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(18px + env(safe-area-inset-top)) 28px 18px;
  color: var(--muted);
}
.chrome__top > *,
.chrome__bottom > * {
  min-width: 0;
}
.chrome__top {
  background: linear-gradient(to bottom, var(--bg-base), transparent);
}
.chrome__bottom {
  background: linear-gradient(to top, var(--bg-base), transparent);
}
.chrome__top-actions {
  min-width: 0;
  max-width: 100%;
  overflow: visible;
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
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-pill);
  font-size: 16px;
  color: var(--ink-soft);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.chrome__icon:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.chrome__icon--label {
  width: auto;
  height: 36px;
  padding: 0 12px;
  gap: 6px;
  display: inline-flex;
  align-items: center;
}
.chrome__icon-glyph {
  font-size: 16px;
  line-height: 1;
}
.chrome__icon-label-text {
  font-family: var(--font-serif-cn);
  font-size: 12px;
  letter-spacing: 0.06em;
}
.chrome__bottom {
  gap: 32px;
}
.chrome__bottom {
  padding-bottom: calc(18px + env(safe-area-inset-bottom));
}
.chrome__top-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}
.chrome__music-bars i {
  display: block;
  width: 2px;
  height: 7px;
  border-radius: 2px;
  background: currentColor;
}
.chrome__music-bars.is-playing i:nth-child(1) { animation: music-bar 700ms ease-in-out infinite alternate; }
.chrome__music-bars.is-playing i:nth-child(2) { animation: music-bar 700ms 180ms ease-in-out infinite alternate; }
.chrome__music-bars.is-playing i:nth-child(3) { animation: music-bar 700ms 340ms ease-in-out infinite alternate; }
@keyframes music-bar { to { height: 14px; } }
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
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.chrome__nav:hover:not(:disabled) {
  background: var(--bg-paper);
  color: var(--accent);
}
.chrome__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.chrome__nav-arrow {
  font-size: 16px;
}
.chrome__progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  max-width: 420px;
}
.chrome__progress-bar {
  height: 1px;
  width: 100%;
  background: var(--border);
  position: relative;
  overflow: hidden;
}
.chrome__progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--accent);
  transition: width var(--dur-mid) var(--ease-out);
}
.chrome__progress-text {
  font-family: var(--font-serif-en);
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--muted);
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.chrome__progress-num {
  font-style: italic;
  font-size: 14px;
  color: var(--ink-soft);
}
.chrome__settings-mask {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(36, 33, 28, 0.32);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}
.settings-enter-active,
.settings-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}
.settings-enter-from,
.settings-leave-to {
  opacity: 0;
}
@media (max-width: 540px) {
  .chrome__top,
  .chrome__bottom {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }
  .chrome__top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 4px 8px;
  }
  .chrome__brand {
    align-self: center;
  }
  .chrome__top-actions {
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px;
    row-gap: 4px;
  }
  .chrome__bottom {
    gap: 8px;
  }
  .chrome__progress {
    max-width: none;
  }
  .chrome__nav {
    flex: 0 0 auto;
    padding: 8px;
  }

  .chrome__icon-label-text {
    display: none;
  }
  .chrome__icon--label {
    padding: 0;
    width: 36px;
  }
}
</style>
