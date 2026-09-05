<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import StoryMap from '@/components/story/StoryMap.vue';

const router = useRouter();
const story = useStoryStore();
const book = useBookStore();

const ready = ref(false);
story.load().then(() => (ready.value = true));

const focused = ref<string | null>(null);

const focusedStory = computed(() => {
  if (!focused.value || !story.index) return null;
  return story.index.byId[focused.value] ?? null;
});

function pick(id: string) {
  focused.value = id;
}

function open() {
  if (!focused.value) return;
  // Find the story-cover page and jump
  const storyId = focused.value;
  const page = book.pages.find((p) => p.type === 'story-cover' && p.storyId === storyId);
  if (page) {
    router.push({ path: '/read', query: { page: String(page.pageNumber) } });
  } else {
    router.push('/read');
  }
}

function back() {
  router.push('/read');
}
</script>

<template>
  <div class="map-view">
    <header class="map-view__top">
      <button class="map-view__back" @click="back">← back to book</button>
      <span class="eyebrow">Story Map</span>
      <button class="map-view__back" disabled>✦</button>
    </header>

    <main class="map-view__stage">
      <div class="map-view__canvas paper-grain">
        <StoryMap @pick="pick" />
      </div>

      <aside class="map-view__panel">
        <div v-if="!focusedStory" class="map-view__hint">
          <p class="eyebrow">Pick a story</p>
          <p class="caption">
            Click any node to peek inside. The map is the index, the index is the map —
            explore the garden however you like.
          </p>
        </div>
        <div v-else class="map-view__card">
          <p class="eyebrow">Chapter · {{ String(focusedStory.order).padStart(2, '0') }}</p>
          <h2 class="map-view__title">{{ focusedStory.title }}</h2>
          <p v-if="focusedStory.subtitle" class="caption">{{ focusedStory.subtitle }}</p>
          <p class="map-view__desc">{{ focusedStory.description ?? '—' }}</p>
          <button class="map-view__open" @click="open">Open story →</button>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.map-view {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}
.map-view__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  color: var(--muted);
}
.map-view__back {
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: var(--ink-soft);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  transition: background var(--dur-fast) var(--ease-out);
}
.map-view__back:hover:not(:disabled) {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.map-view__stage {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  padding: 0 32px 32px;
  min-height: 0;
}
.map-view__canvas {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-paper);
  overflow: hidden;
  position: relative;
}
.map-view__panel {
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.map-view__hint {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.map-view__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.map-view__title {
  font-family: var(--font-serif-cn);
  font-size: 26px;
  margin: 4px 0 0;
  letter-spacing: 0.08em;
  color: var(--ink);
}
.map-view__desc {
  font-family: var(--font-serif-en);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.7;
  margin: 12px 0 0;
  flex: 1;
}
.map-view__open {
  margin-top: 24px;
  padding: 12px 18px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  color: var(--accent);
  font-family: var(--font-serif-en);
  letter-spacing: 0.18em;
  font-size: 13px;
  background: transparent;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.map-view__open:hover {
  background: var(--accent);
  color: var(--bg-paper);
}
@media (max-width: 900px) {
  .map-view__top {
    padding: 16px max(16px, env(safe-area-inset-left)) 16px max(16px, env(safe-area-inset-right));
    gap: 8px;
  }
  .map-view__top > * {
    min-width: 0;
  }
  .map-view__back {
    letter-spacing: 0.08em;
    overflow-wrap: anywhere;
  }
  .map-view__stage {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(220px, 1fr) minmax(180px, auto);
    gap: 12px;
    padding: 0 16px max(16px, env(safe-area-inset-bottom));
  }
  .map-view__canvas,
  .map-view__panel {
    min-width: 0;
  }
  .map-view__panel {
    padding: 16px;
    overflow-y: auto;
  }
  .map-view__title,
  .map-view__desc {
    overflow-wrap: anywhere;
  }
}
</style>
