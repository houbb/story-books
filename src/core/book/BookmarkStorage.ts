/**
 * BookmarkStorage — SPI Interface and LocalStorage Implementation.
 * Follows: Interface first + Strategy pattern + Pluggable storage.
 */

export interface Bookmark {
  id: string;
  storyId: string;
  /** Logical page template index (kept for compatibility with existing data). */
  page: number;
  /** Content slice within the story, when a story spans multiple pages. */
  sliceIndex?: number;
  /** Stable text anchor for restoring a bookmark after pagination changes. */
  anchor?: string;
  title: string;
  snippet: string;
  createdAt: number;
}

export type NewBookmark = Omit<Bookmark, 'id' | 'createdAt'>;

export interface BookmarkStorage {
  list(): Bookmark[];
  add(bookmark: NewBookmark): Bookmark;
  remove(id: string): void;
  has(storyId: string, page: number, sliceIndex?: number): boolean;
}

const BOOKMARK_STORAGE_KEY = 'storybook-engine:bookmarks';

export class LocalStorageBookmarkStorage implements BookmarkStorage {
  list(): Bookmark[] {
    try {
      const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((value): Bookmark[] => {
        if (!value || typeof value !== 'object') return [];
        const item = value as Partial<Bookmark>;
        if (typeof item.storyId !== 'string' || typeof item.page !== 'number') return [];
        return [{
          id: typeof item.id === 'string' ? item.id : `bm_legacy_${item.storyId}_${item.page}`,
          storyId: item.storyId,
          page: item.page,
          sliceIndex: typeof item.sliceIndex === 'number' ? item.sliceIndex : undefined,
          anchor: typeof item.anchor === 'string' ? item.anchor : undefined,
          title: typeof item.title === 'string' ? item.title : '未命名故事',
          snippet: typeof item.snippet === 'string' ? item.snippet : '',
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        }];
      });
    } catch {
      return [];
    }
  }

  add(bookmark: NewBookmark): Bookmark {
    const list = this.list();
    const existing = list.find(
      (b) => b.storyId === bookmark.storyId &&
        (bookmark.anchor ? b.anchor === bookmark.anchor : b.page === bookmark.page && b.sliceIndex === bookmark.sliceIndex)
    );
    if (existing) return existing;

    const created: Bookmark = {
      ...bookmark,
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    list.unshift(created);
    this.save(list);
    return created;
  }

  remove(id: string): void {
    const list = this.list().filter((b) => b.id !== id);
    this.save(list);
  }

  has(storyId: string, page: number, sliceIndex?: number): boolean {
    return this.list().some(
      (b) => b.storyId === storyId && b.page === page && (sliceIndex === undefined || b.sliceIndex === sliceIndex)
    );
  }

  private save(list: Bookmark[]) {
    try {
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* non-fatal */
    }
  }
}

export const bookmarkStorage = new LocalStorageBookmarkStorage();
