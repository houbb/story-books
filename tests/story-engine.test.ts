import { describe, expect, it } from 'vitest';
import { parseStory } from '@/core/story/StoryParser';
import { buildTree, flattenStories } from '@/core/story/StoryTreeBuilder';
import { BookPaginator } from '@/core/book/BookPaginator';
import { MarkdownRenderer } from '@/core/book/MarkdownRenderer';
import { wordCounter, createWordCounterEngine } from '@/core/story/WordCounter';
import { storyStatsProvider } from '@/core/story/StoryStats';
import { storySearchEngine } from '@/core/story/StorySearchEngine';

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
  it('creates cover, index, chapter pairs, and ending', () => {
    const stories = [parseStory('01-moon.md', '月'), parseStory('02-river.md', '河')];
    const index = {
      roots: stories,
      byId: Object.fromEntries(stories.map((story) => [story.id, story])),
      stories,
      totalStories: stories.length,
    };
    const pages = new BookPaginator().paginate(index);
    expect(pages.map((page) => page.type)).toEqual([
      'cover', 'index', 'story-cover', 'content', 'story-cover', 'content', 'ending',
    ]);
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
