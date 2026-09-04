<script setup lang="ts">
import { computed } from 'vue';
import type { BookPageTemplate } from '@/core/book/BookPaginator';
import type { StoryMeta } from '@/core/story/types';

const props = defineProps<{
  page: BookPageTemplate;
  nextStory?: StoryMeta;
  rendered?: { html: string; excerpt: string };
  nextPageNumber?: number;
}>();

const storyOrder = computed(() => {
  const m = props.page.storyId?.match(/^(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
});

const romanOrder = computed(() => {
  const n = storyOrder.value;
  if (!n) return '';
  const map: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
  };
  return map[n] ?? String(n);
});
</script>

<template>
  <div class="book-page story-cover">
    <p class="story-cover__no">CHAPTER {{ romanOrder }}</p>
    <div class="story-cover__rule" />
    <h1 class="story-cover__title">{{ page.title }}</h1>
    <p v-if="page.subtitle" class="story-cover__subtitle">{{ page.subtitle }}</p>
    <p v-if="rendered?.excerpt" class="story-cover__excerpt">"{{ rendered.excerpt }}"</p>
    <p class="story-cover__ornament">✦ ✦ ✦</p>
    <p class="story-cover__hint">turn the page to begin</p>
  </div>
</template>
