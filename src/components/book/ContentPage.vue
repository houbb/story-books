<script setup lang="ts">
import type { BookPageTemplate } from '@/core/book/BookPaginator';
import type { StoryMeta } from '@/core/story/types';

const props = defineProps<{
  page: BookPageTemplate;
  story?: StoryMeta;
  html: string;
  prev?: StoryMeta | null;
  next?: StoryMeta | null;
}>();
</script>

<template>
  <div class="book-page content-page">
    <header class="content-page__head">
      <span class="content-page__breadcrumb">{{ story?.title ?? page.title }}</span>
      <span class="content-page__page-no">— {{ page.pageNumber + 1 }} —</span>
    </header>

    <div class="content-page__body body-prose" v-html="html" />

    <footer class="content-page__foot">
      <span v-if="prev" class="content-page__nav content-page__nav--prev">{{ prev.title }}</span>
      <span v-else />
      <span class="content-page__ornament">✦ ✦ ✦</span>
      <span v-if="next" class="content-page__nav content-page__nav--next">{{ next.title }}</span>
      <span v-else />
    </footer>
  </div>
</template>
