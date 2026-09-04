import { describe, expect, it } from 'vitest';
import { parseStory } from '@/core/story/StoryParser';
import { buildTree, flattenStories } from '@/core/story/StoryTreeBuilder';
import { BookPaginator } from '@/core/book/BookPaginator';
import { MarkdownRenderer } from '@/core/book/MarkdownRenderer';

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
