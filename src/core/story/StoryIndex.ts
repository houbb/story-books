/**
 * StoryIndex — orchestrates source + parser + tree.
 * Single entrypoint for the rest of the app.
 */

import { ViteGlobStorySource } from './ViteGlobStorySource';
import type { StorySource } from './StorySource';
import { parseStory } from './StoryParser';
import { buildTree, flattenStories } from './StoryTreeBuilder';
import type { StoryDocument, StoryIndex, StoryMeta } from './types';

export class StoryIndexBuilder {
  constructor(private readonly source: StorySource = new ViteGlobStorySource()) {}

  async build(): Promise<StoryIndex> {
    const raw = await this.source.loadAll();
    const metas: StoryMeta[] = [];
    let book: StoryMeta | undefined;

    for (const [relPath, content] of Object.entries(raw)) {
      const meta = parseStory(relPath, content);
      if (meta.kind === 'index' && meta.parentId === undefined) {
        book = meta;
        continue;
      }
      metas.push(meta);
    }

    const roots = buildTree(metas);
    const byId: Record<string, StoryMeta> = {};
    for (const s of metas) byId[s.id] = s;
    if (book) byId[book.id] = book;

    const stories = flattenStories(roots).sort((a, b) => a.order - b.order);

    return {
      roots,
      byId,
      stories,
      book,
      totalStories: stories.length,
    };
  }

  /** Helper for navigation: next leaf story after `id` */
  nextStory(index: StoryIndex, id: string): StoryMeta | undefined {
    const idx = index.stories.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    return index.stories[idx + 1];
  }

  /** Helper: previous leaf story before `id` */
  prevStory(index: StoryIndex, id: string): StoryMeta | undefined {
    const idx = index.stories.findIndex((s) => s.id === id);
    if (idx <= 0) return undefined;
    return index.stories[idx - 1];
  }
}

export const storyIndexBuilder = new StoryIndexBuilder();

export type { StoryDocument, StoryIndex, StoryMeta } from './types';
