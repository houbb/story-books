import { describe, expect, it, vi } from 'vitest';
import { parseStory } from '@/core/story/StoryParser';
import { buildTree, flattenStories } from '@/core/story/StoryTreeBuilder';
import { BookPaginator } from '@/core/book/BookPaginator';
import { ParagraphPageBreakStrategy } from '@/core/book/PageBreakStrategy';
import { LocalStorageBookmarkStorage } from '@/core/book/BookmarkStorage';
import { MarkdownRenderer } from '@/core/book/MarkdownRenderer';
import { wordCounter, createWordCounterEngine } from '@/core/story/WordCounter';
import { storyStatsProvider } from '@/core/story/StoryStats';
import { storySearchEngine } from '@/core/story/StorySearchEngine';
import { resolveTheme } from '@/stores/settings';

describe('settings theme', () => {
  it('keeps explicit themes and resolves auto from system preference', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('night')).toBe('night');
    const originalWindow = globalThis.window;
    vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: true })) });
    expect(resolveTheme('auto')).toBe('night');
    vi.stubGlobal('window', originalWindow);
  });
});

describe('story parser', () => {
  it('combines frontmatter with filename defaults', () => {
    const story = parseStory('02-forest/03-fox.md', `---\ntitle: 狐狸\norder: 3\ntags:\n  - forest\n---\n# ignored heading\n\n正文`);
    expect(story.id).toBe('02-forest/03-fox');
    expect(story.title).toBe('狐狸');
    expect(story.order).toBe(3);
    expect(story.parentId).toBe('02-forest');
    expect(story.tags).toEqual(['forest']);
  });
});

describe('story tree', () => {
  it('groups nested stories and flattens leaf stories in order', () => {
    const stories = [
      parseStory('02-city/01-night.md', '夜'),
      parseStory('01-forest/01-moon.md', '月'),
      parseStory('00-prologue.md', '序'),
    ];
    const tree = buildTree(stories);
    expect(tree).toHaveLength(3);
    expect(flattenStories(tree).map((story) => story.title)).toEqual(['Prologue', 'Moon', 'Night']);
  });
});

describe('book paginator', () => {
  it('splits semantic blocks into ordered stable slices', () => {
    const slices = new ParagraphPageBreakStrategy(8).split('<p>一二三四五六</p><p>七八九十</p><p>最后</p>');
    expect(slices.length).toBe(2);
    expect(slices.map((slice) => slice.sliceIndex)).toEqual([0, 1]);
    expect(slices.every((slice) => slice.totalSlices === 2)).toBe(true);
    expect(slices.map((slice) => slice.html).join('')).toContain('最后');
  });

  it('keeps later story pages after variable slice counts', () => {
    const stories = [parseStory('01-long.md', `${'一'.repeat(12)}\n\n${'二'.repeat(12)}\n\n${'三'.repeat(12)}`), parseStory('02-short.md', '短')];
    const index = { roots: stories, byId: Object.fromEntries(stories.map((story) => [story.id, story])), stories, totalStories: 2 };
    const pages = new BookPaginator(new ParagraphPageBreakStrategy(10)).paginate(index);
    expect(pages.find((page) => page.id === 'story-cover-02-short')?.pageNumber).toBeGreaterThan(3);
    expect(new Set(pages.filter((page) => page.type === 'content').map((page) => page.id)).size).toBeGreaterThan(2);
  });

  it('paginates toc across multiple pages when stories exceed page capacity', () => {
    const manyStories = Array.from({ length: 35 }, (_, i) =>
      parseStory(`story-${String(i + 1).padStart(2, '0')}.md`, `内容 ${i + 1}`)
    );
    const index = {
      roots: manyStories,
      byId: Object.fromEntries(manyStories.map((s) => [s.id, s])),
      stories: manyStories,
      totalStories: 35,
    };
    const paginator = new BookPaginator();
    const pages = paginator.paginate(index);

    const indexPages = pages.filter((p) => p.type === 'index');
    expect(indexPages.length).toBeGreaterThan(1);
    expect(indexPages[0].id).toBe('book-index');
    expect(indexPages[1].id).toBe('book-index-1');
    expect(indexPages[0].tocSlice?.items.length).toBe(14);
    expect(indexPages[1].tocSlice?.items.length).toBe(14);
    // Story 15 (which is on second index page) must point to its real story-cover page
    const item15 = indexPages[1].tocSlice?.items[0];
    const story15Cover = pages.find((p) => p.id === `story-cover-${item15?.storyId}`);
    expect(item15?.pageNumber).toBe(story15Cover?.pageNumber);
  });
});

describe('bookmark storage', () => {
  it('persists and deduplicates bookmarks by stable anchor', () => {
    const storage = new LocalStorageBookmarkStorage();
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
      clear: () => memory.clear(),
    });
    localStorage.clear();
    const input = { storyId: 'story', page: 3, sliceIndex: 1, anchor: 'content-story-1', title: '故事', snippet: '一段话' };
    const first = storage.add(input);
    expect(storage.add(input).id).toBe(first.id);
    expect(storage.has('story', 3, 1)).toBe(true);
    storage.remove(first.id);
    expect(storage.list()).toEqual([]);
  });
});


describe('markdown renderer', () => {
  it('renders markdown and removes duplicate leading title', () => {
    const story = parseStory('moon.md', '---\ntitle: 月亮\n---\n# 月亮\n\n很久以前。');
    const result = new MarkdownRenderer().render(story);
    expect(result.html).not.toContain('<h1>月亮</h1>');
    expect(result.html).toContain('很久以前');
  });
});

describe('word counter', () => {
  it('counts CJK characters as one word each', () => {
    expect(wordCounter.count('月亮落进森林')).toBe(6);
  });

  it('splits latin words by whitespace and ignores frontmatter', () => {
    expect(
      wordCounter.count('---\ntitle: skip me\n---\nA fox jumps over the lazy dog.')
    ).toBe(7);
  });

  it('handles mixed CJK + latin', () => {
    expect(wordCounter.count('Hello 世界 from 测试')).toBe(6);
  });

  it('returns 0 for empty bodies', () => {
    expect(wordCounter.count('')).toBe(0);
  });

  it('returns a structured detail breakdown', () => {
    const detail = wordCounter.detail('Hello 世界 from 测试');
    expect(detail.cjk).toBe(4);
    expect(detail.latin).toBe(2);
    expect(detail.total).toBe(6);
    expect(detail.minutes).toBeGreaterThan(0);
  });

  it('a swapped WordCounter implementation is honored', () => {
    const upper = createWordCounterEngine({ count: () => 42 });
    expect(upper.count('anything')).toBe(42);
  });
});

describe('story stats provider', () => {
  it('aggregates per-story and per-parent counts', () => {
    const stories = [
      parseStory('01-forest/01-moon.md', '月'),
      parseStory('01-forest/02-river.md', '河'),
      parseStory('02-city/01-night.md', '夜'),
    ];
    const stats = storyStatsProvider.compute(stories);
    expect(stats.totalStories).toBe(3);
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.ranked[0].wordCount).toBeGreaterThanOrEqual(stats.ranked[2].wordCount);
    expect(stats.byParent).toHaveLength(2);
  });
});

describe('story search engine', () => {
  const stories = [
    parseStory('01-moon.md', '# 月亮\n\n很久很久以前，月亮落进了森林。'),
    parseStory('02-river.md', '# 河\n\n河水静静地流过城市。'),
    parseStory('03-fox.md', '# 狐狸\n\nA fox jumps over the lazy dog by the river.'),
  ];

  it('indexes and finds CJK matches by bigram + substring', () => {
    storySearchEngine.index(stories);
    const hits = storySearchEngine.search('森林');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].storyId).toBe('01-moon');
  });

  it('scores title matches above body matches', () => {
    const hits = storySearchEngine.search('河');
    const titleHit = hits.find((h) => h.storyId === '02-river');
    expect(titleHit).toBeDefined();
    expect(titleHit!.titleScore).toBeGreaterThan(0);
  });

  it('finds latin matches', () => {
    const hits = storySearchEngine.search('fox');
    expect(hits[0].storyId).toBe('03-fox');
  });

  it('returns snippets that contain the highlight markers', () => {
    const hits = storySearchEngine.search('river');
    expect(hits[0].snippet).toContain('«');
    expect(hits[0].snippet).toContain('»');
  });

  it('returns no hits when query is empty or whitespace', () => {
    expect(storySearchEngine.search('')).toEqual([]);
    expect(storySearchEngine.search('   ')).toEqual([]);
  });
});
