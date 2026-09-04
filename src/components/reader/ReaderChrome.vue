<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import SettingsPanel from '@/components/reader/SettingsPanel.vue';

const props = defineProps<{ pageCount: number; musicPlaying: boolean }>();
const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'exit'): void;
  (e: 'toggle-music'): void;
}>();

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
  <div class="chrome">
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
}
.chrome > * {
  pointer-events: auto;
}
.chrome__top,
.chrome__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  color: var(--muted);
}
.chrome__top {
  background: linear-gradient(to bottom, var(--bg-base), transparent);
}
.chrome__bottom {
  background: linear-gradient(to top, var(--bg-base), transparent);
}
.chrome__top-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chrome__brand {
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
.chrome__music-bars {
  display: flex;
  gap: 2px;
  align-items: center;
  height: 14px;
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
  min-width: 220px;
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
  .chrome__icon-label-text {
    display: none;
  }
  .chrome__icon--label {
    padding: 0;
    width: 36px;
  }
}
</style>
