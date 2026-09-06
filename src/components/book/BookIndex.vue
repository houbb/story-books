<script setup lang="ts">
import { computed } from 'vue';
import { isStoryGroup } from '@/core/story/types';
import type { BookPageTemplate } from '@/core/book/BookPaginator';
import type { StoryIndex } from '@/core/story/types';
import type { TocItem } from '@/core/book/TocPaginationStrategy';

const props = defineProps<{
  pages: BookPageTemplate[];
  index: StoryIndex | null;
  page?: BookPageTemplate;
}>();

/**
 * If the page already has pre-sliced tocSlice, use it directly!
 * Otherwise fallback to computing from index.
 */
const sliceItems = computed<TocItem[]>(() => {
  if (props.page?.tocSlice) {
    return props.page.tocSlice.items;
  }
  // Fallback for older calls
  if (!props.index) return [];
  const out: TocItem[] = [];
  let prevGroup: string | undefined;
  let entryIndex = 0;
  for (const root of props.index.roots) {
    if (isStoryGroup(root)) {
      for (const child of root.children) {
        out.push({
          index: entryIndex++,
          storyId: child.id,
          pageNumber: pageForStory(child.id),
          title: child.title,
          subtitle: 'subtitle' in child ? child.subtitle : undefined,
          group: root.title,
        });
      }
      prevGroup = root.title;
    } else {
      out.push({
        index: entryIndex++,
        storyId: root.id,
        pageNumber: pageForStory(root.id),
        title: root.title,
        subtitle: root.subtitle,
        group: prevGroup && prevGroup !== root.title ? prevGroup : undefined,
      });
    }
  }
  return out;
});

const pageTitle = computed(() => props.page?.tocSlice?.displayTitle ?? 'CONTENTS');
const isContinuation = computed(() => (props.page?.sliceIndex ?? 0) > 0);
const sliceInfo = computed(() => {
  const current = (props.page?.sliceIndex ?? 0) + 1;
  const total = props.page?.totalSlices ?? 1;
  return total > 1 ? `${current} / ${total}` : '';
});

function pageForStory(id: string): number {
  const found = props.pages.find((p) => p.type === 'story-cover' && p.storyId === id);
  return found?.pageNumber ?? 0;
}

function jump(page: number) {
  // The flip engine reads page from the hash/event; we dispatch a custom event the Reader listens for.
  window.dispatchEvent(new CustomEvent('storybook:goto', { detail: { page } }));
}
</script>

<template>
  <div class="book-page book-index">
    <div class="book-index__header">
      <h2 class="book-index__title">{{ pageTitle }}</h2>
      <div v-if="isContinuation" class="book-index__sub-badge">续页 · CONTINUED</div>
      <div class="book-index__rule" />
    </div>

    <div class="book-index__list">
      <template v-for="(item, idx) in sliceItems" :key="item.storyId">
        <div v-if="item.group && (idx === 0 || sliceItems[idx - 1].group !== item.group)" class="idx-group">
          <div class="idx-group__head">
            <span class="idx-group__name">{{ item.group }}</span>
            <span class="idx-group__rule" />
          </div>
        </div>
        <a class="idx-item" :data-page="item.pageNumber" @click="jump(item.pageNumber)">
          <span class="idx-item__no">{{ String(item.index + 1).padStart(2, '0') }}</span>
          <span class="idx-item__content">
            <span class="idx-item__title">{{ item.title }}</span>
            <span v-if="item.subtitle" class="idx-item__sub">{{ item.subtitle }}</span>
          </span>
          <span class="idx-item__dots" aria-hidden="true" />
          <span class="idx-item__page">{{ item.pageNumber + 1 }}</span>
        </a>
      </template>
    </div>

    <footer v-if="sliceInfo" class="book-index__foot">
      <span class="book-index__pagination">{{ sliceInfo }}</span>
    </footer>
  </div>
</template>
