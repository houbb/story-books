/**
 * BookPaginator — splits a StoryIndex into physical BookPages.
 *
 * Concept:
 *   BookPage = physical paper  (what you see when you flip)
 *   StoryDocument = logical content (what you author in Markdown)
 *
 * One Story can produce many BookPages using PageBreakStrategy.
 */

import type { StoryIndex, StoryMeta } from '../story/types';
import { defaultPageBreakStrategy, type PageBreakStrategy, type PageSlice } from './PageBreakStrategy';
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
  /** Slice index for multi-page stories */
  sliceIndex?: number;
  /** Total slices for multi-page stories */
  totalSlices?: number;
  /** Pre-sliced HTML if available */
  sliceHtml?: string;
}

export class BookPaginator {
  private pageBreaker: PageBreakStrategy;

  constructor(pageBreaker: PageBreakStrategy = defaultPageBreakStrategy) {
    this.pageBreaker = pageBreaker;
  }

  setStrategy(strategy: PageBreakStrategy) {
    this.pageBreaker = strategy;
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

    // 1 — index (table of contents = story tree)
    pages.push({
      id: 'book-index',
      type: 'index',
      title: 'Contents',
      subtitle: '故事目录',
      pageNumber: 1,
      isChapterStart: true,
    });

    // 2..n — one story-cover + multi-page content slots per leaf story.
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

    // ending
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
