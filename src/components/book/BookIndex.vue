<script setup lang="ts">
import { computed } from 'vue';
import { isStoryGroup } from '@/core/story/types';
import type { BookPageTemplate } from '@/core/book/BookPaginator';
import type { StoryIndex } from '@/core/story/types';

const props = defineProps<{
  pages: BookPageTemplate[];
  index: StoryIndex | null;
}>();

const flatPages = computed(() => props.pages.filter((p) => p.type === 'story-cover' || p.type === 'content'));

/**
 * Build a tree-friendly flat list of story entries. Each leaf story becomes
 * one TOC entry; groups wrap their children visually with a header line.
 */
interface TocEntry {
  pageNumber: number;
  title: string;
  subtitle?: string;
  group?: string;
}

const toc = computed<TocEntry[]>(() => {
  if (!props.index) return [];
  const out: TocEntry[] = [];
  let prevGroup: string | undefined;
  for (const root of props.index.roots) {
    if (isStoryGroup(root)) {
      for (const child of root.children) {
        out.push({
          pageNumber: pageForStory(child.id),
          title: child.title,
          subtitle: 'subtitle' in child ? child.subtitle : undefined,
          group: root.title,
        });
      }
      prevGroup = root.title;
    } else {
      out.push({
        pageNumber: pageForStory(root.id),
        title: root.title,
        subtitle: root.subtitle,
        group: prevGroup && prevGroup !== root.title ? prevGroup : undefined,
      });
    }
  }
  return out;
});

function pageForStory(id: string): number {
  const found = props.pages.find((p) => p.type === 'story-cover' && p.storyId === id);
  return found?.pageNumber ?? 0;
}

function jump(page: number) {
  // The flip engine reads page from the hash; we dispatch a custom event the Reader listens for.
  window.dispatchEvent(new CustomEvent('storybook:goto', { detail: { page } }));
}
</script>

<template>
  <div class="book-page book-index">
    <h2 class="book-index__title">CONTENTS</h2>
    <div class="book-index__rule" />

    <div class="book-index__list">
      <template v-for="(item, idx) in toc" :key="idx">
        <div v-if="item.group && (idx === 0 || toc[idx - 1].group !== item.group)" class="idx-group">
          <div class="idx-group__head">
            <span class="idx-group__name">{{ item.group }}</span>
            <span class="idx-group__rule" />
          </div>
        </div>
        <a class="idx-item" @click="jump(item.pageNumber)">
          <span class="idx-item__no">{{ String(idx + 1).padStart(2, '0') }}</span>
          <span>
            <span class="idx-item__title">{{ item.title }}</span>
            <span v-if="item.subtitle" class="idx-item__sub">{{ item.subtitle }}</span>
          </span>
          <span class="idx-item__page">{{ item.pageNumber + 1 }}</span>
        </a>
      </template>
    </div>
  </div>
</template>
