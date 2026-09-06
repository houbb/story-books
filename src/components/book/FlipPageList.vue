<script setup lang="ts">
/**
 * FlipPageList — scroll-snap 一屏一页翻页组件。
 * 移动端阅读模式使用：每一页占满整个视口（宽度 100%），
 * 通过横向滑动在整页之间切换，杜绝翻书效果中「双页占位 → 显示不全」的问题。
 * 桌面端保留 page-flip 翻书动画，不使用本组件。
 *
 * 事件语义与 Reader.vue 中 page-flip 的回调保持一致：
 *  - change(page)  当前逻辑页变化（含初始化）
 *  - reach-start / reach-end  越界保护
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { BookPageTemplate } from '@/core/book/BookPaginator';

const props = withDefaults(
  defineProps<{
    /** 逻辑页模板（BookPaginator 输出） */
    pages: BookPageTemplate[];
    /** 初始逻辑页号 */
    startPage?: number;
    /** 是否允许滑动翻页 */
    swipeEnabled?: boolean;
  }>(),
  {
    startPage: 0,
    swipeEnabled: true,
  }
);

const emit = defineEmits<{
  (e: 'change', page: number): void;
  (e: 'reach-start'): void;
  (e: 'reach-end'): void;
}>();

const scrollerEl = ref<HTMLElement | null>(null);
const current = ref(0);

function clamp(p: number): number {
  return Math.max(0, Math.min(props.pages.length - 1, p));
}

/** 横向位置 → 逻辑页（四舍五入到最近整页，容忍横向长内容页） */
function indexFromScroll(): number {
  const el = scrollerEl.value;
  if (!el || el.clientWidth <= 0) return current.value;
  return clamp(Math.round(el.scrollLeft / el.clientWidth));
}

function syncFromScroll() {
  const el = scrollerEl.value;
  if (!el) return;
  const idx = indexFromScroll();
  if (idx !== current.value) {
    current.value = idx;
    emit('change', idx);
  }
  if (el.scrollLeft <= 2) emit('reach-start');
  if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) emit('reach-end');
}

function onScroll() {
  // 单页内部（长篇溢出的纵向区域）滚动时，横向 scrollLeft 不变，直接跳过，避免误触发翻页。
  const el = scrollerEl.value;
  if (!el || Math.abs(el.scrollLeft - current.value * el.clientWidth) < el.clientWidth * 0.5) return;
  syncFromScroll();
}

function scrollToPage(p: number, behavior: ScrollBehavior = 'auto') {
  const el = scrollerEl.value;
  if (!el) return;
  el.scrollTo({ left: clamp(p) * el.clientWidth, behavior });
}

watch(
  () => props.startPage,
  (p) => {
    if (typeof p === 'number' && p !== current.value) {
      current.value = clamp(p);
      nextTick(() => scrollToPage(current.value));
    }
  }
);

watch(
  () => props.pages.length,
  () => {
    if (!scrollerEl.value) return;
    nextTick(() => {
      scrollToPage(current.value);
      syncFromScroll();
    });
  }
);

onMounted(() => {
  nextTick(() => {
    current.value = clamp(props.startPage);
    scrollToPage(current.value);
    emit('change', current.value);
  });
});

onBeforeUnmount(() => {
  const el = scrollerEl.value;
  if (!el) return;
  el.removeEventListener('scroll', onScroll);
  el.removeEventListener('scrollend', syncFromScroll);
  // 卸载前取消进行中的平滑滚动，防止停止滚动后触发 scrollend 导致状态回跳
  el.scrollTo({ left: clamp(current.value) * el.clientWidth, behavior: 'auto' });
});

defineExpose({
  current: () => current.value,
  scrollToPage,
  syncFromScroll,
});
</script>

<template>
  <div
    ref="scrollerEl"
    class="flip-list"
    :class="{ 'flip-list--static': !swipeEnabled }"
    tabindex="-1"
    @scroll="onScroll"
  >
    <section
      v-for="(page, i) in pages"
      :key="page.id"
      class="flip-list__page"
      :data-page-index="i"
    >
      <slot name="page" :page="page" :index="i" />
    </section>
  </div>
</template>

<style scoped>
.flip-list {
  position: absolute;
  inset: 0;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
}
.flip-list::-webkit-scrollbar {
  display: none;
}
.flip-list__page {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  scroll-snap-align: start;
  /* 单页内超出一屏的内容（长章节）纵向滚动可达，横向手势仍归翻页容器 */
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}
.flip-list__page :deep(.book-page) {
  height: auto;
  min-height: 100%;
}
/* 需要锁定某一页时（例如沉浸模式下预览），禁止滚动与吸附跳动 */
.flip-list--static {
  overflow: hidden;
}
</style>
