<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { PageFlip } from 'page-flip';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { useSettingsStore } from '@/stores/settings';
import { bookPaginator } from '@/core/book/BookPaginator';
import { markdownRenderer } from '@/core/book/MarkdownRenderer';
import { renderPageHtml } from '@/core/book/PageRenderer';
import ReaderChrome from '@/components/reader/ReaderChrome.vue';
import { useAmbientAudio } from '@/composables/useAmbientAudio';
import BookCover from '@/components/book/BookCover.vue';
import BookIndex from '@/components/book/BookIndex.vue';
import StoryCover from '@/components/book/StoryCover.vue';
import ContentPage from '@/components/book/ContentPage.vue';
import StoryEnding from '@/components/book/StoryEnding.vue';
import '@/styles/page.css';

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
let flip: PageFlip | null = null;
let resizeObserver: ResizeObserver | null = null;

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
  const isMobile = rect.width < 720;
  const width = isMobile ? rect.width : Math.floor(rect.width / 2);
  const height = Math.floor(rect.height);
  return { width, height, isMobile };
}

function applySize() {
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
  if (!flipEl.value || pages.value.length === 0) return;
  if (flip) {
    flip.destroy();
    flip = null;
  }
  const { width, height, isMobile } = computeSize();
  const tpls = pages.value;

  // Pre-render every page to HTML and inject it into the host container.
  const htmls = await Promise.all(
    tpls.map(async (tpl, i) => {
      if (tpl.type === 'cover') {
        return renderPageHtml(BookCover, { page: tpl });
      }
      if (tpl.type === 'index') {
        return renderPageHtml(BookIndex, { pages: tpls, index: index.value });
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

  flipEl.value.innerHTML = htmls.join('');

  const pageEls = Array.from(flipEl.value.children) as HTMLElement[];

  flip = new PageFlip(flipEl.value, {
    width,
    height,
    size: { width, height },
    showCover: true,
    autoSize: false,
    usePortrait: isMobile,
    flippingTime: isMobile ? 600 : 900,
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
  const hasRequestedPage = Number.isInteger(requestedPage) && requestedPage >= 0;
  const start = hasRequestedPage
    ? Math.min(requestedPage, tpls.length - 1)
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

function next() {
  flip?.flipNext();
}
function prev() {
  flip?.flipPrev();
}

function onGoto(event: Event) {
  const page = Number((event as CustomEvent<{ page?: number }>).detail?.page);
  if (Number.isInteger(page) && page >= 0) flip?.turnToPage(page);
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
    if (book.showStoryMap) book.setShowStoryMap(false);
    else exit();
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    book.setShowStoryMap(!book.showStoryMap);
  } else if (e.key === 'Home') {
    flip?.turnToPage(0);
  } else if (e.key === 'End') {
    flip?.turnToPage(pages.value.length - 1);
  }
}

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
  flip?.destroy();
  flip = null;
});
</script>

<template>
  <div class="reader">
    <div ref="stageEl" class="reader__stage paper-grain">
      <div ref="flipEl" class="reader__flip" :class="{ 'is-ready': ready }" />
    </div>

    <ReaderChrome
      :page-count="pages.length"
      :music-playing="musicPlaying"
      @prev="prev"
      @next="next"
      @exit="exit"
      @toggle-music="toggleMusic"
    />
  </div>
</template>

<style scoped>
.reader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reader__stage {
  position: relative;
  width: min(96vw, 1400px);
  height: min(92vh, 920px);
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
}
.reader__flip.is-ready {
  animation: fade-up var(--dur-slow) var(--ease-out) both;
}
</style>
