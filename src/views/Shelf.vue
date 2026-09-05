<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStoryStore } from '@/stores/story';
import { bookmarkStorage, type Bookmark } from '@/core/book/BookmarkStorage';

const router = useRouter();
const story = useStoryStore();
const bookmarks = ref<Bookmark[]>([]);
onMounted(async () => {
  await story.load();
  bookmarks.value = bookmarkStorage.list();
});
const grouped = computed(() => {
  const map = new Map<string, Bookmark[]>();
  bookmarks.value.forEach((item) => map.set(item.storyId, [...(map.get(item.storyId) ?? []), item]));
  return [...map.entries()].map(([storyId, items]) => ({
    storyId,
    title: story.index?.byId[storyId]?.title ?? items[0]?.title ?? storyId,
    items,
  }));
});
function open(bookmark: Bookmark) {
  router.push({ path: '/read', query: { story: bookmark.storyId, page: String(bookmark.page) } });
}
</script>

<template>
  <main class="shelf">
    <header class="shelf__header">
      <button class="shelf__back" aria-label="返回首页" @click="router.push('/')">←</button>
      <div><span class="eyebrow">THE STORY GARDEN</span><h1>我的书房</h1></div>
    </header>
    <section v-if="bookmarks.length" class="shelf__groups">
      <article v-for="group in grouped" :key="group.storyId" class="shelf__card">
        <h2>{{ group.title }}</h2>
        <button v-for="item in group.items" :key="item.id" class="shelf__bookmark" @click="open(item)">
          <span>⚑ {{ item.snippet || '继续阅读' }}</span><small>第 {{ item.page + 1 }} 页</small>
        </button>
      </article>
    </section>
    <section v-else class="shelf__empty"><span class="shelf__seed">✦</span><h2>书房还是一颗种子</h2><p>在阅读中点亮书签，重要的段落会留在这里。</p></section>
  </main>
</template>

<style scoped>
.shelf { min-height: 100%; padding: 32px clamp(20px, 6vw, 80px); color: var(--ink); }
.shelf__header { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
.shelf__back { width: 38px; height: 38px; border-radius: 50%; font-size: 20px; color: var(--ink-soft); }
.shelf__back:hover { background: var(--bg-paper-deep); }
h1 { margin: 8px 0 0; font-size: 32px; }
.shelf__groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.shelf__card { padding: 20px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-paper); }
h2 { margin: 0 0 14px; font-size: 18px; }
.shelf__bookmark { display: flex; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 0; border-top: 1px solid var(--border); color: var(--ink-soft); text-align: left; }
.shelf__bookmark:hover { color: var(--accent); }
small { white-space: nowrap; color: var(--muted); }
.shelf__empty { padding: 80px 20px; text-align: center; color: var(--muted); }
.shelf__seed { display: block; margin-bottom: 16px; color: var(--accent); font-size: 42px; }
.shelf__empty h2 { color: var(--ink-soft); }
@media (max-width: 540px) {
  .shelf {
    padding: 20px 16px 72px;
    overflow-y: auto;
  }
  .shelf__header {
    gap: 12px;
    margin-bottom: 24px;
  }
  .shelf__groups {
    grid-template-columns: minmax(0, 1fr);
  }
  .shelf__card {
    padding: 16px;
    min-width: 0;
  }
  .shelf__bookmark > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  small {
    flex: 0 0 auto;
  }
}
</style>
