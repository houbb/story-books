<script setup lang="ts">
/**
 * StatsView — shows total words / per-chapter counts / reading minutes.
 *
 * All numbers are recomputed via the StoryStatsProvider interface, so the view
 * never depends on a concrete counter implementation.
 */
import { computed } from 'vue';
import { useStoryStore } from '@/stores/story';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { storyStatsProvider } from '@/core/story/StoryStats';

const story = useStoryStore();
const router = useRouter();
const { index } = storeToRefs(story);

const stats = computed(() => {
  if (!index.value) return null;
  return storyStatsProvider.compute(index.value.stories);
});

function open(storyId: string) {
  router.push({ path: '/read', query: { story: storyId } });
}

function back() {
  router.push('/');
}

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function rankLabel(idx: number) {
  return String(idx + 1).padStart(2, '0');
}
</script>

<template>
  <div class="stats">
    <header class="stats__top">
      <button class="stats__back" @click="back">← back to cover</button>
      <span class="eyebrow">A Reader's Ledger · 字数汇总</span>
      <span class="caption">v 0.3 · 一座可以阅读的故事森林</span>
    </header>

    <main v-if="stats" class="stats__main">
      <section class="stats__hero">
        <p class="eyebrow">the whole book</p>
        <h1 class="stats__hero-num">
          <span class="stats__num">{{ fmt(stats.totalWords) }}</span>
          <span class="stats__unit">字 · words</span>
        </h1>
        <p class="caption stats__hero-cap">
          {{ stats.totalStories }} stories · ~{{ stats.totalMinutes }} minute read
        </p>
      </section>

      <section class="stats__groups" v-if="stats.byParent.length">
        <p class="eyebrow">by chapter</p>
        <div class="stats__chips">
          <article v-for="g in stats.byParent" :key="g.parentId ?? 'root'" class="stats__chip">
            <span class="stats__chip-title">{{ g.title }}</span>
            <span class="stats__chip-num">{{ fmt(g.words) }}</span>
            <span class="caption">{{ g.stories }} 篇</span>
          </article>
        </div>
      </section>

      <section class="stats__ranking">
        <header class="stats__ranking-head">
          <p class="eyebrow">ranked by length</p>
          <span class="caption">tap any row to open the story</span>
        </header>
        <ol class="stats__list">
          <li
            v-for="(row, idx) in stats.ranked"
            :key="row.storyId"
            class="stats__row"
            @click="open(row.storyId)"
          >
            <span class="stats__rank">{{ rankLabel(idx) }}</span>
            <span class="stats__title" :title="row.path">{{ row.title }}</span>
            <span class="stats__bar">
              <span
                class="stats__bar-fill"
                :style="{ width: `${Math.round((row.wordCount / (stats.ranked[0]?.wordCount || 1)) * 100)}%` }"
              />
            </span>
            <span class="stats__words">{{ fmt(row.wordCount) }}</span>
            <span class="caption stats__mins">~{{ row.readingMinutes }} min</span>
          </li>
        </ol>
      </section>
    </main>

    <p v-else class="caption stats__loading">loading stories…</p>
  </div>
</template>

<style scoped>
.stats {
  position: relative;
  min-height: 100%;
  padding: 32px 48px 96px;
  display: flex;
  flex-direction: column;
  gap: 36px;
  overflow-y: auto;
  height: 100%;
  background: var(--bg-base);
}
.stats__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--muted);
}
.stats__back {
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--ink-soft);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
}
.stats__back:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.stats__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 0 32px;
}
.stats__hero-num {
  font-family: var(--font-serif-en);
  font-size: clamp(64px, 12vw, 144px);
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--ink);
  display: flex;
  align-items: baseline;
  gap: 18px;
}
.stats__num {
  font-feature-settings: 'lnum' 1;
}
.stats__unit {
  font-family: var(--font-serif-cn);
  font-size: clamp(14px, 1.5vw, 18px);
  letter-spacing: 0.32em;
  color: var(--muted);
}
.stats__hero-cap {
  margin: 0;
}
.stats__groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stats__chips {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.stats__chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
}
.stats__chip-title {
  font-family: var(--font-serif-cn);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink);
}
.stats__chip-num {
  font-family: var(--font-serif-en);
  font-size: 28px;
  font-weight: 500;
  color: var(--accent);
  font-feature-settings: 'lnum' 1;
}
.stats__ranking {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stats__ranking-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.stats__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stats__row {
  display: grid;
  grid-template-columns: 40px 1.4fr 1fr 90px 80px;
  align-items: center;
  gap: 18px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-paper);
  border: 1px solid transparent;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  cursor: pointer;
}
.stats__row:hover {
  border-color: var(--accent);
  transform: translateX(2px);
}
.stats__rank {
  font-family: var(--font-serif-en);
  font-style: italic;
  color: var(--muted);
  letter-spacing: 0.18em;
}
.stats__title {
  font-family: var(--font-serif-cn);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stats__bar {
  height: 4px;
  background: var(--bg-paper-deep);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.stats__bar-fill {
  display: block;
  height: 100%;
  background: var(--accent-soft);
  transition: width var(--dur-mid) var(--ease-out);
}
.stats__words {
  font-family: var(--font-serif-en);
  font-feature-settings: 'lnum' 1;
  font-size: 18px;
  font-weight: 500;
  color: var(--ink);
  text-align: right;
}
.stats__mins {
  text-align: right;
}
.stats__loading {
  text-align: center;
  margin-top: 96px;
  color: var(--muted);
}
@media (max-width: 720px) {
  .stats {
    padding: 24px 18px 64px;
  }
  .stats__top,
  .stats__ranking-head {
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .stats__top > *,
  .stats__ranking-head > * {
    min-width: 0;
  }
  .stats__hero {
    padding-top: 28px;
  }
  .stats__hero-num {
    max-width: 100%;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 10px;
    font-size: clamp(48px, 18vw, 88px);
    overflow-wrap: anywhere;
  }
  .stats__unit {
    letter-spacing: 0.12em;
  }
  .stats__chips {
    grid-template-columns: minmax(0, 1fr);
  }
  .stats__row {
    min-width: 0;
    grid-template-columns: 28px minmax(0, 1fr) 60px;
    grid-template-rows: auto auto;
    gap: 6px 12px;
  }
  .stats__title,
  .stats__words {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .stats__bar,
  .stats__mins {
    grid-column: 2 / -1;
  }
}
</style>
