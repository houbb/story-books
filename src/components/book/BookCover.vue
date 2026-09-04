<script setup lang="ts">
import type { BookPageTemplate } from '@/core/book/BookPaginator';

defineProps<{ page: BookPageTemplate }>();
</script>

<template>
  <div class="book-page book-cover">
    <div class="book-cover__frame" />
    <p class="book-cover__eyebrow">{{ page.subtitle ?? 'A Digital Storybook' }}</p>
    <h1 class="book-cover__title">{{ page.title }}</h1>
    <div class="book-cover__rule" />
    <p class="book-cover__subtitle">{{ page.subtitle ?? '一座可以阅读的故事森林' }}</p>
    <p class="book-cover__author" v-if="page.author">— {{ page.author }} —</p>
    <p class="book-cover__ornament">✦</p>
  </div>
</template>
