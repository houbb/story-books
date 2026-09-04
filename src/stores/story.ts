/**
 * story — global StoryIndex lifecycle + current story.
 */

import { defineStore } from 'pinia';
import { storyIndexBuilder } from '@/core/story/StoryIndex';
import type { StoryIndex, StoryMeta } from '@/core/story/types';

export const useStoryStore = defineStore('story', {
  state: () => ({
    index: null as StoryIndex | null,
    loading: false,
    error: null as string | null,
    /** Currently open story id (leaf) */
    currentId: null as string | null,
    /** Stories whose covers/pages have been visited */
    visited: [] as string[],
  }),
  getters: {
    ready: (s) => !!s.index && !s.loading,
    book: (s) => s.index?.book ?? null,
    books: (s) => s.index?.stories ?? [],
    byId: (s) => (id: string) => s.index?.byId?.[id],
    current: (s): StoryMeta | null => {
      if (!s.currentId || !s.index) return null;
      return s.index.byId[s.currentId] ?? null;
    },
    /** Leaf story list with order */
    orderedStories: (s) => [...(s.index?.stories ?? [])].sort((a, b) => a.order - b.order),
  },
  actions: {
    async load() {
      if (this.index) return;
      this.loading = true;
      this.error = null;
      try {
        this.index = await storyIndexBuilder.build();
      } catch (e) {
        // Keep the full error in console so browser debugging can locate the root cause.
        console.error('[story] Failed to build story index:', e);
        this.error = e instanceof Error ? e.message : String(e);
      } finally {
        this.loading = false;
      }
    },
    setCurrent(id: string) {
      this.currentId = id;
      if (!this.visited.includes(id)) this.visited.push(id);
    },
    markVisited(id: string) {
      if (!this.visited.includes(id)) this.visited.push(id);
    },
  },
});