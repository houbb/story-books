/**
 * TocPaginationStrategy — SPI interface for splitting table of contents into pages.
 *
 * Design Principle:
 *   Interface first + Strategy pattern + Pluggable ready.
 */

import type { StoryIndex, StoryMeta } from '../story/types';
import { isStoryGroup } from '../story/types';

export interface TocItem {
  index: number;
  storyId: string;
  pageNumber: number; // target physical page number
  title: string;
  subtitle?: string;
  group?: string;
}

export interface TocPageSlice {
  sliceIndex: number;
  totalSlices: number;
  items: TocItem[];
  displayTitle: string; // e.g. "CONTENTS" or "CONTENTS · 续"
}

export interface TocPaginationStrategy {
  readonly id: string;
  /**
   * Given stories and tree structure, calculate how many TOC pages are required.
   * This allows two-pass pagination so that physical story page numbers are known precisely.
   */
  estimatePageCount(items: Omit<TocItem, 'pageNumber'>[]): number;

  /**
   * Split the resolved TOC items (with their exact target page numbers) into book page slices.
   */
  paginate(items: TocItem[]): TocPageSlice[];
}

export interface DefaultTocPaginationOptions {
  /** Target max items per index page to avoid visual clipping */
  pageSize?: number;
  /** Weight penalty for group headers when calculating page density */
  groupHeaderWeight?: number;
}

export class DefaultTocPaginationStrategy implements TocPaginationStrategy {
  readonly id = 'default-toc-pagination';
  private pageSize: number;

  constructor(options: DefaultTocPaginationOptions = {}) {
    this.pageSize = options.pageSize ?? 14;
  }

  estimatePageCount(items: Omit<TocItem, 'pageNumber'>[]): number {
    if (items.length === 0) return 1;
    return Math.max(1, Math.ceil(items.length / this.pageSize));
  }

  paginate(items: TocItem[]): TocPageSlice[] {
    if (items.length === 0) {
      return [
        {
          sliceIndex: 0,
          totalSlices: 1,
          items: [],
          displayTitle: 'CONTENTS',
        },
      ];
    }

    const slices: TocPageSlice[] = [];
    const totalSlices = Math.max(1, Math.ceil(items.length / this.pageSize));

    for (let i = 0; i < totalSlices; i++) {
      const sliceItems = items.slice(i * this.pageSize, (i + 1) * this.pageSize);
      slices.push({
        sliceIndex: i,
        totalSlices,
        items: sliceItems,
        displayTitle: i === 0 ? 'CONTENTS' : `CONTENTS · ${i + 1}`,
      });
    }

    return slices;
  }
}

export const defaultTocPaginationStrategy = new DefaultTocPaginationStrategy();
