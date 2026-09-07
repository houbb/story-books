<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { useSettingsStore } from '@/stores/settings';
import { bookPaginator, type BookPageTemplate } from '@/core/book/BookPaginator';
import { markdownRenderer } from '@/core/book/MarkdownRenderer';
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

const router = useRouter();
const route = useRoute();
const story = useStoryStore();
const book = useBookStore();
const settings = useSettingsStore();
const { playing: musicPlaying, toggle: toggleMusic } = useAmbientAudio();
const { index } = storeToRefs(story);

const stageEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const chromeVisible = ref(true);
let resizeObserver: ResizeObserver | null = null;
let rebuildTimer: number | null = null;
let mountGeneration = 0;

/** 全端统一采用 FlipPageList 渲染容器 */
const listEl = ref<InstanceType<typeof FlipPageList> | null>(null);
const listPages = ref<BookPageTemplate[]>([]);
const listStartPage = ref(0);

/** 根据用户设置的字号自适应计算单页字符容量 */
const charsPerPage = computed(() => {
  const baseSize = 15;
  const currentSize = settings.fontSize || baseSize;
  const factor = Math.max(0.7, Math.min(1.3, (baseSize / currentSize) ** 1.2));
  // 280 纯文本字符：既保证段落充沛饱满，又在 footer 细线之上留足安全边距
  return Math.round(280 * factor);
});

const pages = computed(() =>
  index.value ? bookPaginator.paginate(index.value, { maxCharsPerPage: charsPerPage.value }) : []
);

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

function syncCurrent(p: number) {
  book.setCurrent(p);
  const tpl = pages.value[p];
  if (tpl?.storyId) story.setCurrent(tpl.storyId);
  settings.recordReading(tpl?.storyId ?? null, p);
}

async function mountReader() {
  const generation = ++mountGeneration;
  if (pages.value.length === 0) return;
  if (resizeObserver) resizeObserver.disconnect();

  const tpls = pages.value;
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
  book.setPages(tpls);
  book.setPhysicalCount(tpls.length);

  await nextTick();
  if (generation !== mountGeneration) return;

  listEl.value?.scrollToPage(start);
  syncCurrent(start);
  book.open();
  ready.value = true;

  if (stageEl.value) {
    resizeObserver = new ResizeObserver(() => {
      listEl.value?.scrollToPage(book.currentPage);
      listEl.value?.syncFromScroll();
    });
    resizeObserver.observe(stageEl.value);
  }
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

function prevStory(storyId: string): StoryMeta | null {
  const idx = index.value?.stories.findIndex((s) => s.id === storyId) ?? -1;
  return idx > 0 ? (index.value?.stories[idx - 1] ?? null) : null;
}

function nextStory(storyId: string): StoryMeta | null {
  const idx = index.value?.stories.findIndex((s) => s.id === storyId) ?? -1;
  return idx >= 0 ? (index.value?.stories[idx + 1] ?? null) : null;
}

function coverNextPageNumber(storyId: string | undefined, fallback: number): number {
  if (!storyId) return fallback;
  const found = pages.value.findIndex(
    (p) => p.type === 'content' && p.storyId === storyId
  );
  return found >= 0 ? found : fallback;
}

function next() {
  listEl.value?.scrollToPage(book.currentPage + 1, 'smooth');
}
function prev() {
  listEl.value?.scrollToPage(book.currentPage - 1, 'smooth');
}

function onListChange(page: number) {
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
  listEl.value?.scrollToPage(page, 'smooth');
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
    listEl.value?.scrollToPage(0);
  } else if (e.key === 'End') {
    listEl.value?.scrollToPage(pages.value.length - 1);
  }
}

/** 桌面端左右区域点击翻页 / 中央点击折叠工具栏 */
function onStageClick(e: MouseEvent) {
  if (!stageEl.value) return;
  const rect = stageEl.value.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (ratio <= 0.2) prev();
  else if (ratio >= 0.8) next();
  else chromeVisible.value = !chromeVisible.value;
}

watch(
  () => [settings.fontSize, settings.cjkFont, settings.latinFont],
  () => {
    if (!index.value) return;
    if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
    const currentId = pages.value[book.currentPage]?.id;
    rebuildTimer = window.setTimeout(() => {
      rebuildTimer = null;
      void mountReader().then(() => {
        const target = currentId ? pages.value.findIndex((page) => page.id === currentId) : -1;
        if (target >= 0) listEl.value?.scrollToPage(target);
      });
    }, 100);
  }
);

watch(index, () => {
  if (index.value) mountReader();
});

function onWheel(e: WheelEvent) {
  // 如果事件发生在可滚动的正文区域内部，优先供正文垂直滚动，严禁触发切页
  const target = e.target as HTMLElement | null;
  const scrollableBody = target?.closest('.content-page__body') as HTMLElement | null;
  if (scrollableBody) {
    // 当正文还有滚动余地时，完全交由原生上下滚动处理
    const canScrollUp = scrollableBody.scrollTop > 0;
    const canScrollDown =
      scrollableBody.scrollTop + scrollableBody.clientHeight < scrollableBody.scrollHeight - 1;
    if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
      return;
    }
  }

  // 仅在明确进行水平横向扫动（如触控板左右轻扫），或已到顶/底且大幅横向滚动时触发翻页
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
    if (e.deltaX > 30) next();
    else if (e.deltaX < -30) prev();
  }
}

onMounted(async () => {
  await story.load();
  requestAnimationFrame(() => mountReader());
  window.addEventListener('keydown', onKey);
  window.addEventListener('storybook:goto', onGoto);
  stageEl.value?.addEventListener('wheel', onWheel, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('storybook:goto', onGoto);
  stageEl.value?.removeEventListener('wheel', onWheel);
  resizeObserver?.disconnect();
  if (rebuildTimer !== null) window.clearTimeout(rebuildTimer);
  mountGeneration++;
  listEl.value = null;
});
</script>

<template>
  <div class="reader">
    <div ref="stageEl" class="reader__stage paper-grain" @click="onStageClick">
      <FlipPageList
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
  /* 顶部预留工具栏避让空间，底部预留 92px，完全避开底部翻页控件与渐变 */
  padding: calc(64px + env(safe-area-inset-top)) 24px
    calc(92px + env(safe-area-inset-bottom)) 24px;
  box-sizing: border-box;
}
.reader__stage {
  position: relative;
  /* 大气自适应布局：占满 100% 宽度，配合宽屏优雅自适应 */
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-base);
  box-shadow: var(--shadow-deep);
  cursor: pointer;
}
@media (max-width: 720px) {
  .reader {
    padding: calc(48px + env(safe-area-inset-top)) 8px
      calc(64px + env(safe-area-inset-bottom)) 8px;
  }
  .reader__stage {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
  }
}
</style>
