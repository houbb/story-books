<script setup lang="ts">
import { computed } from 'vue';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { isStoryGroup } from '@/core/story/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', pageNumber: number): void;
}>();

const story = useStoryStore();
const book = useBookStore();

interface TocEntry {
  storyId: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  group?: string;
}

const toc = computed<TocEntry[]>(() => {
  if (!story.index) return [];
  const out: TocEntry[] = [];
  let prevGroup: string | undefined;

  for (const root of story.index.roots) {
    if (isStoryGroup(root)) {
      for (const child of root.children) {
        out.push({
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

function pageForStory(id: string): number {
  const found = book.pages.find((p) => p.type === 'story-cover' && p.storyId === id);
  return found?.pageNumber ?? 0;
}

function selectStory(entry: TocEntry) {
  emit('select', entry.pageNumber);
  emit('close');
}
</script>

<template>
  <div class="toc-drawer" role="dialog" aria-modal="true" aria-label="全书章节目录">
    <header class="toc-drawer__head">
      <div>
        <span class="eyebrow">Contents · 全书目录</span>
        <h3 class="toc-drawer__title">{{ story.index?.book?.title ?? 'The Story Garden' }}</h3>
      </div>
      <button class="toc-drawer__close" aria-label="关闭目录" @click="emit('close')">✕</button>
    </header>

    <div class="toc-drawer__list">
      <template v-for="(item, idx) in toc" :key="item.storyId">
        <div v-if="item.group && (idx === 0 || toc[idx - 1].group !== item.group)" class="toc-drawer__group">
          <span>{{ item.group }}</span>
        </div>
        <button
          class="toc-drawer__item"
          :class="{ 'is-active': book.currentStoryId === item.storyId }"
          @click="selectStory(item)"
        >
          <span class="toc-drawer__no">{{ String(idx + 1).padStart(2, '0') }}</span>
          <div class="toc-drawer__info">
            <span class="toc-drawer__item-title">{{ item.title }}</span>
            <span v-if="item.subtitle" class="toc-drawer__item-sub">{{ item.subtitle }}</span>
          </div>
          <span class="toc-drawer__page">p.{{ item.pageNumber + 1 }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toc-drawer {
  width: min(420px, 92vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-deep);
  overflow: hidden;
}
.toc-drawer__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-paper);
}
.toc-drawer__title {
  font-family: var(--font-serif-cjk);
  font-size: 16px;
  margin: 4px 0 0;
  color: var(--ink);
}
.toc-drawer__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-circle);
  color: var(--muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.toc-drawer__close:hover {
  background: var(--bg-secondary);
  color: var(--ink);
}
.toc-drawer__list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.toc-drawer__group {
  font-family: var(--font-serif-en);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--muted);
  text-transform: uppercase;
  padding: 12px 8px 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.toc-drawer__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  text-align: left;
  background: transparent;
  transition: background var(--dur-fast) var(--ease-out);
  width: 100%;
}
.toc-drawer__item:hover {
  background: var(--bg-secondary);
}
.toc-drawer__item.is-active {
  background: var(--accent-bg);
  border: 1px solid var(--accent-soft);
}
.toc-drawer__item.is-active .toc-drawer__item-title {
  color: var(--accent);
  font-weight: 600;
}
.toc-drawer__no {
  font-family: var(--font-serif-en);
  font-size: 12px;
  color: var(--muted);
  width: 24px;
  flex-shrink: 0;
}
.toc-drawer__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.toc-drawer__item-title {
  font-family: var(--font-serif-cjk);
  font-size: 14px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc-drawer__item-sub {
  font-size: 11px;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toc-drawer__page {
  font-family: var(--font-serif-en);
  font-size: 12px;
  color: var(--muted);
  flex-shrink: 0;
}
</style>
