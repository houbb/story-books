/**
 * BookPaginator — splits a StoryIndex into physical BookPages.
 *
 * Concept:
 *   BookPage = physical paper  (what you see when you flip)
 *   StoryDocument = logical content (what you author in Markdown)
 *
 * One Story can produce many BookPages using PageBreakStrategy.
 * Table of contents (BookIndex) also paginates naturally across multiple physical pages.
 */

import type { StoryIndex, StoryMeta } from '../story/types';
import { isStoryGroup } from '../story/types';
import { defaultPageBreakStrategy, type PageBreakStrategy, type PageSlice } from './PageBreakStrategy';
import {
  defaultTocPaginationStrategy,
  type TocPaginationStrategy,
  type TocItem,
  type TocPageSlice,
} from './TocPaginationStrategy';
import { markdownRenderer } from './MarkdownRenderer';

export type BookPageType = 'cover' | 'index' | 'story-cover' | 'content' | 'ending';

export interface BookPageTemplate {
  /** Stable id used by the flip engine and routing */
  id: string;
  type: BookPageType;
  storyId?: string;
  title?: string;
  subtitle?: string;
  /** Author, used for chapter/ending credits */
  author?: string;
  description?: string;
  /** Logical page number — 0 is the book cover */
  pageNumber: number;
  /** Whether this page starts a new spread (chapter break) */
  isChapterStart?: boolean;
  /** Slice index for multi-page stories or multi-page TOC */
  sliceIndex?: number;
  /** Total slices for multi-page stories or multi-page TOC */
  totalSlices?: number;
  /** Pre-sliced HTML if available */
  sliceHtml?: string;
  /** Pre-computed TOC page slice data for index pages */
  tocSlice?: TocPageSlice;
}

export class BookPaginator {
  private pageBreaker: PageBreakStrategy;
  private tocStrategy: TocPaginationStrategy;

  constructor(
    pageBreaker: PageBreakStrategy = defaultPageBreakStrategy,
    tocStrategy: TocPaginationStrategy = defaultTocPaginationStrategy
  ) {
    this.pageBreaker = pageBreaker;
    this.tocStrategy = tocStrategy;
  }

  setStrategy(strategy: PageBreakStrategy) {
    this.pageBreaker = strategy;
  }

  setTocStrategy(strategy: TocPaginationStrategy) {
    this.tocStrategy = strategy;
  }

  paginate(index: StoryIndex): BookPageTemplate[] {
    const pages: BookPageTemplate[] = [];

    // 0 — book cover (uses index.md frontmatter if present)
    pages.push({
      id: 'book-cover',
      type: 'cover',
      title: index.book?.title ?? 'The Story Garden',
      subtitle: index.book?.subtitle ?? '一座可以阅读的故事森林',
      author: index.book?.author,
      description: index.book?.description,
      pageNumber: 0,
      isChapterStart: true,
    });

    // 1. Build raw TOC item list
    const rawItems: Array<{
      index: number;
      storyId: string;
      title: string;
      subtitle?: string;
      group?: string;
    }> = [];

    let entryIndex = 0;
    let prevGroup: string | undefined;
    for (const root of index.roots) {
      if (isStoryGroup(root)) {
        for (const child of root.children) {
          rawItems.push({
            index: entryIndex++,
            storyId: child.id,
            title: child.title,
            subtitle: 'subtitle' in child ? child.subtitle : undefined,
            group: root.title,
          });
        }
        prevGroup = root.title;
      } else {
        rawItems.push({
          index: entryIndex++,
          storyId: root.id,
          title: root.title,
          subtitle: root.subtitle,
          group: prevGroup && prevGroup !== root.title ? prevGroup : undefined,
        });
      }
    }

    // 2. Estimate TOC page count to calculate the starting page of stories
    const tocPageCount = this.tocStrategy.estimatePageCount(rawItems);

    // 3. Pre-calculate the physical starting page for each story
    const storyPageMap = new Map<string, number>();
    let currentStoryPageOffset = 1 + tocPageCount; // after cover (1) + all toc pages

    for (const s of index.stories) {
      storyPageMap.set(s.id, currentStoryPageOffset);
      const rendered = markdownRenderer.render(s);
      const slices = this.pageBreaker.split(rendered.html);
      // 1 for story-cover + slices.length content pages
      currentStoryPageOffset += 1 + slices.length;
    }

    // 4. Build exact TocItems with correct target physical page numbers
    const tocItems: TocItem[] = rawItems.map((item) => ({
      ...item,
      pageNumber: storyPageMap.get(item.storyId) ?? 0,
    }));

    // 5. Slice TOC into pages
    const tocSlices = this.tocStrategy.paginate(tocItems);

    tocSlices.forEach((slice, idx) => {
      pages.push({
        id: idx === 0 ? 'book-index' : `book-index-${idx}`,
        type: 'index',
        title: slice.displayTitle,
        subtitle: idx === 0 ? '故事目录' : `目录续页 (${idx + 1}/${slice.totalSlices})`,
        pageNumber: pages.length,
        isChapterStart: true,
        sliceIndex: idx,
        totalSlices: slice.totalSlices,
        tocSlice: slice,
      });
    });

    // 6. Append stories with their exact page numbers
    index.stories.forEach((s) => {
      pages.push({
        id: `story-cover-${s.id}`,
        type: 'story-cover',
        storyId: s.id,
        title: s.title,
        subtitle: s.subtitle,
        author: s.author,
        description: s.description,
        pageNumber: pages.length,
        isChapterStart: true,
      });

      // Split story HTML into slices to prevent page overflow clipping
      const rendered = markdownRenderer.render(s);
      const slices: PageSlice[] = this.pageBreaker.split(rendered.html);

      slices.forEach((slice, idx) => {
        pages.push({
          id: `content-${s.id}-${idx}`,
          type: 'content',
          storyId: s.id,
          title: s.title,
          pageNumber: pages.length,
          sliceIndex: idx,
          totalSlices: slice.totalSlices,
          sliceHtml: slice.html,
        });
      });
    });

    // 7. Ending
    pages.push({
      id: 'book-ending',
      type: 'ending',
      title: 'The Garden Grows',
      subtitle: '尾声 · 故事待续',
      description:
        '你走出了这片森林，但它依然在生长。把你的 Markdown 放进 stories/，下一次翻开，树木便多了一棵。',
      pageNumber: pages.length,
      isChapterStart: true,
    });

    return pages;
  }

  /** Locate the story represented by a logical page template. */
  storyForPage(index: StoryIndex, pageNumber: number): StoryMeta | undefined {
    return index.byId[this.paginate(index)[pageNumber]?.storyId ?? ''];
  }
}

export const bookPaginator = new BookPaginator();

/** Backwards-compatible lookup helper for callers that only have an id. */
export function getStoryById(index: StoryIndex, id: string): StoryMeta | undefined {
  return index.byId[id];
}
