/**
 * BookPaginator — splits a StoryIndex into physical BookPages.
 *
 * Concept:
 *   BookPage = physical paper  (what you see when you flip)
 *   StoryDocument = logical content (what you author in Markdown)
 *
 * One Story can produce many BookPages. The Reader measures DOM at runtime
 * and stashes physical pages into the flip engine. The paginator here only
 * produces *logical* page templates with stable ids.
 */

import type { StoryIndex, StoryMeta } from '../story/types';

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
}

export class BookPaginator {
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

    // 2..n — one story-cover + one content slot per leaf story.
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
      title: 'The Story Continues',
      subtitle: '— 尾声 —',
      pageNumber: pages.length,
      isChapterStart: true,
    });

    return pages;
  }

  /** Locate a story by its page template index (first content slot for that story). */
  storyForPage(index: StoryIndex, pageNumber: number): StoryMeta | undefined {
    const list = index.stories;
    return list[Math.max(0, Math.min(pageNumber - 2, list.length - 1))];
  }
}

export const bookPaginator = new BookPaginator();

export function getStoryById(index: StoryIndex, id: string): StoryMeta | undefined {
  return index.byId[id];
}
