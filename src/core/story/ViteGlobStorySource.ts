/**
 * ViteGlobStorySource — default StorySource backed by Vite's import.meta.glob.
 * Auto-discovers all .md files under src/stories.
 */

import type { StorySource } from './StorySource';

// `?raw` + `eager: true` returns the raw text content at build time.
const modules = import.meta.glob<string>('/src/stories/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export class ViteGlobStorySource implements StorySource {
  async loadAll(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [absPath, content] of Object.entries(modules)) {
      // /src/stories/01-forest/01-moon.md → 01-forest/01-moon.md
      const relPath = absPath.replace(/^\/src\/stories\//, '');
      result[relPath] = content;
    }
    return result;
  }
}
