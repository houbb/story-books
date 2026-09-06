<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { PageFlip } from 'page-flip';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { useSettingsStore } from '@/stores/settings';
import { bookPaginator, type BookPageTemplate } from '@/core/book/BookPaginator';
import { markdownRenderer } from '@/core/book/MarkdownRenderer';
import { renderPageHtml } from '@/core/book/PageRenderer';
import type { StoryMeta } from '@/core/story/types';
import ReaderChrome from '@/components/reader/ReaderChrome.vue';
import { useAmbientAudio } from '@/composables/useAmbientAudio';
import BookCover from '@/components/book/BookCover.vue';
import BookIndex from '@/components/book/BookIndex.vue';
import StoryCover from '@/components/book/StoryCover.vue';
import ContentPage from '@/components/book/ContentPage.vue';
import StoryEnding from '@/components/book/StoryEnding.vue';
import FlipPageList from '@/components/book/FlipPageList.vue';
import '@/styles/page.css';

/** 移动端判定宽度：与 page-flip 的 usePortrait 断点保持一致 */
const MOBILE_BREAKPOINT = 720;

const router = useRouter();
const route = useRoute();
const story = useStoryStore();
const book = useBookStore();
const settings = useSettingsStore();
const { playing: musicPlaying, toggle: toggleMusic } = useAmbientAudio();
const { index } = storeToRefs(story);

const flipEl = ref<HTMLElement | null>(null);
const stageEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const chromeVisible = ref(true);
let flip: PageFlip | null = null;
let resizeObserver: ResizeObserver | null = null;
let rebuildTimer: number | null = null;
let mountGeneration = 0;
let pointerStart: { x: number; y: number } | null = null;
let pointerDragged = false;
let desktopPointerEl: HTMLElement | null = null;
/** 移动端滑动模式持有的状态 */
const isMobileMode = ref(false);
const listEl = ref<InstanceType<typeof FlipPageList> | null>(null);
const listPages = ref<BookPageTemplate[]>([]);
/** 进入移动端模式时记录的起始页：仅用于模板初始渲染 */
const listStartPage = ref(0);

const pages = computed(() => (index.value ? bookPaginator.paginate(index.value) : []));

const rendered = computed(() => {
  const out = new Map<string, { html: string; excerpt: string }>();
  if (!index.value) return out;
  for (const s of index.value.stories) {
    out.set(s.id, markdownRenderer.render(s));
  }
  return out;
});

function exit() {
  router.push('/');
}

function computeSize() {
  if (!stageEl.value) return { width: 600, height: 800, isMobile: false };
  const rect = stageEl.value.getBoundingClientRect();
  const isMobile = rect.width < MOBILE_BREAKPOINT;
  const width = isMobile ? rect.width : Math.floor(rect.width / 2);
  const height = Math.floor(rect.height);
  return { width, height, isMobile };
}

function applySize() {
  if (isMobileMode.value) {
    // 移动端滑动模式：页面 100% 宽自适应，无需重建；
    // 但折叠工具栏等尺寸变化可能影响 stage 宽高，这里做一次对齐修正。
    const el = stageEl.value;
    if (el && listEl.value) {
      listEl.value.scrollToPage(book.currentPage);
      listEl.value.syncFromScroll();
    }
    return;
  }
  if (!flip) return;
  const { width, height, isMobile } = computeSize();
  flip.updateSize({ width, height });
  flip.setOrientation(isMobile ? 'portrait' : 'landscape');
}

function syncCurrent(p: number) {
  book.setCurrent(p);
  const tpl = pages.value[p];
  if (tpl?.storyId) story.setCurrent(tpl.storyId);
  settings.recordReading(tpl?.storyId ?? null, p);
}

async function mountFlip() {
  const generation = ++mountGeneration;
  if (!flipEl.value || pages.value.length === 0) return;
  if (resizeObserver) resizeObserver.disconnect();
  if (flip) {
    flip.destroy();
    flip = null;
  }
  const { width, height, isMobile } = computeSize();

  const tpls = pages.value;
  if (isMobile) {
    // 移动端：一屏一页滑动模式，全部页面 100% 宽顺序排列。
    const resume = settings.lastPosition;
    const requestedPage = Number(route.query.page);
    const requestedStory = typeof route.query.story === 'string' ? route.query.story : null;
    const storyIdx =
      requestedStory && index.value?.byId[requestedStory]
        ? index.value.stories.findIndex((s) => s.id === requestedStory)
        : -1;
    const hasRequestedStory = storyIdx >= 0;
    const hasRequestedPage = Number.isInteger(requestedPage) && requestedPage >= 0;
    const start = hasRequestedPage
      ? Math.min(requestedPage, tpls.length - 1)
      : hasRequestedStory
        ? Math.max(0, tpls.findIndex((page) => page.storyId === requestedStory))
        : resume && resume.storyId && index.value?.byId[resume.storyId] && resume.page >= 0
          ? Math.min(resume.page, tpls.length - 1)
          : 0;
    listPages.value = tpls;
    listStartPage.value = start;
    isMobileMode.value = true;
    book.setPages(tpls);
    book.setPhysicalCount(tpls.length);
    await nextTick();
    if (generation !== mountGeneration) return;
    listEl.value?.scrollToPage(start);
    syncCurrent(start);
    book.open();
    ready.value = true;
    if (stageEl.value) {
      resizeObserver = new ResizeObserver(() => applySize());
      resizeObserver.observe(stageEl.value);
    }
    return;
  }

  // 桌面端：page-flip 翻书（双页），原有逻辑保持不变。
  listStartPage.value = 0;
  isMobileMode.value = false;
  listPages.value = [];

  // Pre-render every page to HTML and inject it into the host container.
  const htmls = await Promise.all(
    tpls.map(async (tpl, i) => {
      if (tpl.type === 'cover') {
        return renderPageHtml(BookCover, { page: tpl });
      }
      if (tpl.type === 'index') {
        return renderPageHtml(BookIndex, { pages: tpls, index: index.value, page: tpl });
      }
      if (tpl.type === 'story-cover') {
        const next = tpls[i + 1];
        const nextTpl = next?.type === 'content' ? next : undefined;
        return renderPageHtml(StoryCover, {
          page: tpl,
          nextStory: tpl.storyId ? index.value?.byId[tpl.storyId] : undefined,
          rendered: tpl.storyId ? rendered.value.get(tpl.storyId) : undefined,
          nextPageNumber: nextTpl?.pageNumber ?? tpl.pageNumber,
        });
      }
      if (tpl.type === 'content') {
        const storyMeta = tpl.storyId ? index.value?.byId[tpl.storyId] : undefined;
        const meta = tpl.storyId ? rendered.value.get(tpl.storyId) : undefined;
        const idx = index.value?.stories.findIndex((s) => s.id === tpl.storyId) ?? -1;
        const prev = idx > 0 ? index.value?.stories[idx - 1] : null;
        const next = idx >= 0 ? index.value?.stories[idx + 1] : null;
        return renderPageHtml(ContentPage, {
          page: tpl,
          story: storyMeta,
          html: meta?.html ?? '',
          prev,
          next,
        });
      }
      return renderPageHtml(StoryEnding, { page: tpl });
    })
  );

  if (generation !== mountGeneration || !flipEl.value) return;
  flipEl.value.innerHTML = htmls.join('');

  const pageEls = Array.from(flipEl.value.children) as HTMLElement[];

  flip = new PageFlip(flipEl.value, {
    width,
    height,
    // page-flip only accepts 'fixed' | 'stretch'; we compute width/height ourselves.
    size: 'fixed',
    showCover: true,
    autoSize: false,
    usePortrait: isMobile,
    flippingTime: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : isMobile ? 600 : 900,
    maxShadowOpacity: 0.55,
    minWidth: 280,
    maxWidth: 1400,
    showPageCorners: true,
    drawShadow: true,
  });

  flip.on('flip', (e: unknown) => {
    const detail = (e as { data?: number })?.data;
    if (typeof detail === 'number') syncCurrent(detail);
  });

  flip.loadFromHTML(pageEls);
  book.setPages(tpls);
  book.setPhysicalCount(flip.getPageCount());

  const resume = settings.lastPosition;
  const requestedPage = Number(route.query.page);
  const requestedStory = typeof route.query.story === 'string' ? route.query.story : null;
  const storyIdx =
    requestedStory && index.value?.byId[requestedStory]
      ? index.value.stories.findIndex((s) => s.id === requestedStory)
      : -1;
  const hasRequestedStory = storyIdx >= 0;
  const hasRequestedPage = Number.isInteger(requestedPage) && requestedPage >= 0;
  const start = hasRequestedPage
    ? Math.min(requestedPage, tpls.length - 1)
    : hasRequestedStory
      ? Math.max(0, tpls.findIndex((page) => page.storyId === requestedStory))
      : resume && resume.storyId && index.value?.byId[resume.storyId] && resume.page >= 0
        ? Math.min(resume.page, tpls.length - 1)
        : 0;
  flip.turnToPage(start);
  syncCurrent(start);
  book.open();
  ready.value = true;

  if (stageEl.value) {
    resizeObserver = new ResizeObserver(() => applySize());
    resizeObserver.observe(stageEl.value);
  }
}

function onStagePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  desktopPointerEl = stageEl.value ?? null;
  pointerStart = { x: event.clientX, y: event.clientY };
  pointerDragged = false;
}

function onStagePointerMove(event: PointerEvent) {
  if (!pointerStart) return;
  if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12) {
    pointerDragged = true;
  }
}

function onStagePointerUp(event: PointerEvent) {
  desktopPointerEl = null;
  if (!pointerStart || pointerDragged || !stageEl.value || isMobileMode.value) {
    pointerStart = null;
    return;
  }
  const rect = stageEl.value.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  if (ratio <= 0.25) prev();
  else if (ratio >= 0.75) next();
  else chromeVisible.value = !chromeVisible.value;
  pointerStart = null;
}

function onStagePointerCancel() {
  pointerStart = null;
  pointerDragged = false;
}

function onStageClick(event: MouseEvent) {
  if (isMobileMode.value || desktopPointerEl) return;
  if (event.detail === 0) return;
  // Pointer events own the tap behavior; this handler is retained for keyboard users.
  if (!stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  if (ratio <= 0.25) prev();
  else if (ratio >= 0.75) next();
  else chromeVisible.value = !chromeVisible.value;
}

const currentPage = computed(() => pages.value[book.currentPage]);
const currentStory = computed(() => {
  const page = currentPage.value;
  return page?.storyId ? index.value?.byId[page.storyId] : undefined;
});
const currentSnippet = computed(() => {
  const html = currentPage.value?.sliceHtml ?? '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
});
const shareUrl = computed(() => {
  const storyId = currentPage.value?.storyId;
  return storyId ? new URL(router.resolve({ name: 'read', query: { story: storyId } }).href, window.location.origin).href : '';
});

/** 移动端滑动模式：故事 cover 前的上一个/下一个故事 */
function prevStory(storyId: string): StoryMeta | null {
  const idx = index.value?.stories.findIndex((s) => s.id === storyId) ?? -1;
  return idx > 0 ? (index.value?.stories[idx - 1] ?? null) : null;
}

function nextStory(storyId: string): StoryMeta | null {
  const idx = index.value?.stories.findIndex((s) => s.id === storyId) ?? -1;
  return idx >= 0 ? (index.value?.stories[idx + 1] ?? null) : null;
}

/** 移动端滑动模式：故事 cover 提示语的页码 —— 指向该故事第一页正文 */
function coverNextPageNumber(storyId: string | undefined, fallback: number): number {
  if (!storyId) return fallback;
  const found = pages.value.findIndex(
    (p) => p.type === 'content' && p.storyId === storyId
  );
  return found >= 0 ? found : fallback;
}

function next() {
  if (isMobileMode.value) {
    listEl.value?.scrollToPage(book.currentPage + 1, 'smooth');
    return;
  }
  flip?.flipNext();
}
function prev() {
  if (isMobileMode.value) {
    listEl.value?.scrollToPage(book.currentPage - 1, 'smooth');
    return;
  }
  flip?.flipPrev();
}

/** 移动端滑动模式：由 FlipPageList 驱动的逻辑页变化 */
function onListChange(page: number) {
  if (!isMobileMode.value) return;
  syncCurrent(page);
}

function onListReachStart() {
  book.setCurrent(0);
}

function onListReachEnd() {
  book.setCurrent(pages.value.length - 1);
}

function onGoto(event: Event) {
  const page = Number((event as CustomEvent<{ page?: number }>).detail?.page);
  if (!Number.isInteger(page) || page < 0) return;
  if (isMobileMode.value) listEl.value?.scrollToPage(page, 'smooth');
  else flip?.turnToPage(page);
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLElement && /input|textarea/i.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault();
    next();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    prev();
  } else if (e.key === 'Escape') {
    if (!chromeVisible.value) {
      chromeVisible.value = true;
    } else if (book.showStoryMap) book.setShowStoryMap(false);
    else exit();
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    router.push('/search');
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    router.push('/map');
  } else if (e.key === 'Home') {
    if (isMobileMode.value) listEl.value?.scrollToPage(0);
    else flip?.turnToPage(0);
  } else if (e.key === 'End') {
    if (isMobileMode.value) listEl.value?.scrollToPage(pages.value.length - 1);
    else flip?.turnToPage(pages.value.length - 1);
  }
}

watch(
  () => [settings.fontSize, settings.cjkFont, settings.latinFont],
  () => {
    if (!index.value || !flipEl.value) return;
    if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
    const currentId = pages.value[book.currentPage]?.id;
    rebuildTimer = window.setTimeout(() => {
      rebuildTimer = null;
      void mountFlip().then(() => {
        const target = currentId ? pages.value.findIndex((page) => page.id === currentId) : -1;
        if (isMobileMode.value) {
          if (target >= 0) listEl.value?.scrollToPage(target);
          return;
        }
        if (flip && target >= 0) flip.turnToPage(target);
      });
    }, 100);
  }
);

watch(index, () => {
  if (index.value && flipEl.value) mountFlip();
});

onMounted(async () => {
  await story.load();
  requestAnimationFrame(() => mountFlip());
  window.addEventListener('keydown', onKey);
  window.addEventListener('storybook:goto', onGoto);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('storybook:goto', onGoto);
  resizeObserver?.disconnect();
  if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
  mountGeneration++;
  flip?.destroy();
  flip = null;
  desktopPointerEl = null;
  listEl.value = null;
});
</script>

<template>
  <div class="reader">
    <div ref="stageEl" class="reader__stage paper-grain">
      <FlipPageList
        v-if="isMobileMode"
        ref="listEl"
        :pages="listPages"
        :start-page="listStartPage"
        @change="onListChange"
        @reach-start="onListReachStart"
        @reach-end="onListReachEnd"
      >
        <template #page="{ page }">
          <BookCover v-if="page.type === 'cover'" :page="page" class="book-page" />
          <BookIndex
            v-else-if="page.type === 'index'"
            :pages="pages"
            :index="index"
            :page="page"
            class="book-page"
          />
          <StoryCover
            v-else-if="page.type === 'story-cover'"
            :page="page"
            :next-story="page.storyId ? index?.byId[page.storyId] : undefined"
            :rendered="page.storyId ? rendered.get(page.storyId) : undefined"
            :next-page-number="coverNextPageNumber(page.storyId, page.pageNumber)"
            class="book-page"
          />
          <ContentPage
            v-else-if="page.type === 'content'"
            :page="page"
            :story="page.storyId ? index?.byId[page.storyId] : undefined"
            :html="page.storyId ? rendered.get(page.storyId)?.html ?? '' : ''"
            :prev="page.storyId ? prevStory(page.storyId) : null"
            :next="page.storyId ? nextStory(page.storyId) : null"
            class="book-page"
          />
          <StoryEnding v-else :page="page" class="book-page" />
        </template>
      </FlipPageList>

      <div
        v-show="!isMobileMode"
        ref="flipEl"
        class="reader__flip"
        :class="{ 'is-ready': ready }"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="onStagePointerUp"
        @pointercancel="onStagePointerCancel"
      />
    </div>

    <ReaderChrome
      :page-count="pages.length"
      :music-playing="musicPlaying"
      :visible="chromeVisible"
      :story-id="currentStory?.id"
      :story-title="currentStory?.title"
      :page-title="currentPage?.title"
      :page-snippet="currentSnippet"
      :page-anchor="currentPage?.id"
      :slice-index="currentPage?.sliceIndex"
      :share-url="shareUrl"
      :quote="currentSnippet"
      @prev="prev"
      @next="next"
      @exit="exit"
      @toggle-music="toggleMusic"
      @toggle-collapse="chromeVisible = !chromeVisible"
      @share="() => undefined"
      @quote-card="() => undefined"
    />
  </div>
</template>

<style scoped>
.reader {
  position: fixed;
  inset: 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.reader__stage {
  position: relative;
  width: min(96vw, 1400px);
  height: min(92vh, 920px);
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-base);
  box-shadow: var(--shadow-deep);
}
.reader__flip {
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: 100%;
  touch-action: pan-y;
}
.reader__flip.is-ready {
  animation: fade-up var(--dur-slow) var(--ease-out) both;
}
@media (max-width: 720px) {
  .reader__stage {
    width: min(100%, calc(100vw - 16px));
    height: min(100%, calc(100dvh - 16px));
    height: min(100%, calc(100vh - 16px));
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
  }
}
</style>
