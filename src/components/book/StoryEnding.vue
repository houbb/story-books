<script setup lang="ts">
import type { BookPageTemplate } from '@/core/book/BookPaginator';
defineProps<{ page: BookPageTemplate }>();
</script>

<template>
  <div class="book-page story-ending">
    <p class="story-ending__ornament">· · ·</p>
    <h1 class="story-ending__title">{{ page.title }}</h1>
    <div class="story-ending__rule" />
    <p class="story-ending__subtitle">{{ page.subtitle }}</p>
    <p class="story-ending__hint">close the book or turn back to begin again</p>
  </div>
</template>
