<script setup lang="ts">
/**
 * SearchView — full-text search over StoryIndex.
 *
 * The view talks only to the StorySearchEngine interface, so swapping the
 * default linear engine for lunr / minisearch later is a one-line change.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStoryStore } from '@/stores/story';
import { storySearchEngine } from '@/core/story/StorySearchEngine';

const route = useRoute();
const router = useRouter();
const story = useStoryStore();
const { index } = storeToRefs(story);

const query = ref<string>(typeof route.query.q === 'string' ? route.query.q : '');
const ready = ref(false);

const hits = computed(() => {
  if (!query.value.trim()) return [];
  return storySearchEngine.search(query.value.trim(), 30);
});

const storiesById = computed(() => index.value?.byId ?? {});

watch(
  () => route.query.q,
  (q) => {
    query.value = typeof q === 'string' ? q : '';
  }
);

watch(query, (q) => {
  router.replace({ path: '/search', query: q ? { q } : undefined });
});

onMounted(async () => {
  await story.load();
  if (index.value) {
    storySearchEngine.index(index.value.stories);
  }
  ready.value = true;
});

function open(storyId: string) {
  router.push({ path: '/read', query: { story: storyId } });
}

function highlight(snippet: string) {
  return snippet
    .replace(/«/g, '<mark>')
    .replace(/»/g, '</mark>');
}

function back() {
  router.push('/');
}
</script>

<template>
  <div class="search">
    <header class="search__top">
      <button class="search__back" @click="back">← back to cover</button>
      <span class="eyebrow">Search · 全文检索</span>
      <span class="caption" v-if="ready">⌘K anywhere to focus this search</span>
      <span class="caption" v-else>indexing…</span>
    </header>

    <main class="search__main">
      <div class="search__input-wrap">
        <span class="search__icon">⌕</span>
        <input
          ref="inputEl"
          v-model="query"
          class="search__input"
          type="search"
          autofocus
          placeholder="Search by title, paragraph, word…  按标题、正文、关键词搜索"
        />
      </div>

      <p v-if="!query" class="caption search__hint">
        Try <em>月</em>, <em>forest</em>, <em>狐狸</em> — the engine searches across all stories by token, bigram and title.
      </p>

      <p v-else-if="hits.length === 0" class="caption search__empty">
        no stories match <strong>“{{ query }}”</strong> · 没有命中
      </p>

      <ol v-else class="search__list">
        <li
          v-for="(hit, idx) in hits"
          :key="hit.storyId + idx"
          class="search__row"
          @click="open(hit.storyId)"
        >
          <span class="search__rank">#{{ String(idx + 1).padStart(2, '0') }}</span>
          <div class="search__body">
            <p class="eyebrow">
              {{ storiesById[hit.storyId]?.parentId ?? 'root' }}
            </p>
            <h3 class="search__title">
              {{ storiesById[hit.storyId]?.title ?? hit.storyId }}
            </h3>
            <p class="search__snippet" v-html="highlight(hit.snippet)" />
          </div>
          <span class="caption search__occurrences">
            {{ hit.occurrences }} 命中
          </span>
        </li>
      </ol>
    </main>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  min-height: 100%;
  padding: 32px 48px 96px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow-y: auto;
  height: 100%;
  background: var(--bg-base);
}
.search__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--muted);
}
.search__back {
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--ink-soft);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
}
.search__back:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.search__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
  padding: 6px 18px;
}
.search__icon {
  font-family: var(--font-serif-en);
  font-size: 22px;
  color: var(--muted);
  margin-right: 12px;
}
.search__input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-serif-cn);
  font-size: 20px;
  color: var(--ink);
  padding: 14px 0;
  outline: none;
}
.search__input::placeholder {
  color: var(--muted);
  font-style: italic;
}
.search__hint,
.search__empty {
  color: var(--muted);
}
.search__empty strong {
  color: var(--ink);
  font-style: italic;
}
.search__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.search__row {
  display: grid;
  grid-template-columns: 56px 1fr 100px;
  align-items: start;
  gap: 18px;
  padding: 18px 22px;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.search__row:hover {
  border-color: var(--accent);
  transform: translateX(2px);
}
.search__rank {
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 18px;
  color: var(--accent);
  letter-spacing: 0.18em;
}
.search__title {
  font-family: var(--font-serif-cn);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink);
  margin: 4px 0;
}
.search__snippet {
  font-family: var(--font-serif-cn);
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
}
.search__snippet :deep(mark) {
  background: rgba(200, 168, 120, 0.45);
  color: var(--ink);
  padding: 0 2px;
  border-radius: 3px;
}
.search__occurrences {
  text-align: right;
  color: var(--muted);
}
@media (max-width: 720px) {
  .search {
    padding: 24px 18px 64px;
  }
  .search__top {
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .search__top > * {
    min-width: 0;
  }
  .search__top .caption {
    flex-basis: 100%;
  }
  .search__row {
    min-width: 0;
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 16px;
  }
  .search__body,
  .search__title,
  .search__snippet {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .search__occurrences {
    grid-column: 2;
    text-align: left;
  }
}
</style>
