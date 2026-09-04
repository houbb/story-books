/**
 * BookPaginator — splits a StoryIndex into physical BookPages.
 *
 * Concept:
 *   BookPage = physical paper  (what you see when you flip)
 *   StoryDocument = logical content (what you author in Markdown)
 *
 * One Story can produce many BookPages. We don't pre-measure DOM height
 * (that's the flip engine's job). Instead we emit *page templates* with
 * IDs and types; the Reader measures at runtime and stashes into physical pages.
 */

import type { StoryIndex, StoryMeta } from '../story/types';

export type BookPageType = 'cover' | 'index' | 'story-cover' | 'content' | 'ending';

export interface BookPageTemplate {
  id: string;
  type: BookPageType;
  storyId?: string;
  title?: string;
  subtitle?: string;
  /** Logical page number — starts at 0 for the cover */
  pageNumber: number;
  /** Whether this is a "chapter start" (newspaper-style cover) */
  isChapterStart?: boolean;
}

export class BookPaginator {
  paginate(index: StoryIndex): BookPageTemplate[] {
    const pages: BookPageTemplate[] = [];

    // 0 — book cover
    pages.push({
      id: 'book-cover',
      type: 'cover',
      title: index.book?.title ?? 'The Story Garden',
      subtitle: index.book?.subtitle,
      pageNumber: 0,
      isChapterStart: true,
    });

    // 1 — index
    pages.push({
      id: 'book-index',
      type: 'index',
      title: 'Contents',
      pageNumber: 1,
      isChapterStart: true,
    });

    // 2..n — one content slot per story. The Reader will split internally.
    index.stories.forEach((s, i) => {
      pages.push({
        id: `story-cover-${s.id}`,
        type: 'story-cover',
        storyId: s.id,
        title: s.title,
        subtitle: s.subtitle,
        pageNumber: pages.length,
        isChapterStart: true,
      });
      pages.push({
        id: `content-${s.id}`,
        type: 'content',
        storyId: s.id,
        title: s.title,
        pageNumber: pages.length,
      });
    });

    // ending
    pages.push({
      id: 'book-ending',
      type: 'ending',
      title: 'End',
      pageNumber: pages.length,
      isChapterStart: true,
    });

    return pages;
  }
}

export const bookPaginator = new BookPaginator();

export function getStoryById(index: StoryIndex, id: string): StoryMeta | undefined {
  return index.byId[id];
}
