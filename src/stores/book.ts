/**
 * book — runtime state of the Book (current page, opened status, layout).
 * Persisted to localStorage via the settings store; this store is ephemeral.
 */

import { defineStore } from 'pinia';
import type { BookPageTemplate } from '@/core/book/BookPaginator';

export interface BookState {
  pages: BookPageTemplate[];
  /** 0-based logical page index from BookPaginator */
  currentPage: number;
  opened: boolean;
  /** Total physical pages after the engine measures heights */
  physicalCount: number;
  /** Layout density — affects page sizing */
  layout: 'auto' | 'wide' | 'cozy';
  /** Visibility of the Story Map overlay */
  showStoryMap: boolean;
}

export const useBookStore = defineStore('book', {
  state: (): BookState => ({
    pages: [],
    currentPage: 0,
    opened: false,
    physicalCount: 0,
    layout: 'auto',
    showStoryMap: false,
  }),
  getters: {
    pageCount: (s) => s.pages.length,
    current: (s) => s.pages[s.currentPage],
    currentStoryId: (s) => s.pages[s.currentPage]?.storyId ?? null,
    isCover: (s) => s.currentPage === 0,
    isEnding: (s) => s.currentPage === s.pages.length - 1,
    isIndex: (s) => s.pages[s.currentPage]?.type === 'index',
    progress: (s) => (s.pages.length <= 1 ? 0 : s.currentPage / (s.pages.length - 1)),
  },
  actions: {
    setPages(pages: BookPageTemplate[]) {
      this.pages = pages;
    },
    setCurrent(page: number) {
      if (page < 0 || page >= this.pages.length) return;
      this.currentPage = page;
    },
    next() {
      this.setCurrent(Math.min(this.pages.length - 1, this.currentPage + 1));
    },
    prev() {
      this.setCurrent(Math.max(0, this.currentPage - 1));
    },
    open() {
      this.opened = true;
    },
    close() {
      this.opened = false;
    },
    setPhysicalCount(n: number) {
      this.physicalCount = n;
    },
    setShowStoryMap(v: boolean) {
      this.showStoryMap = v;
    },
  },
});
