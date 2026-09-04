/**
 * ViteGlobStorySource — default StorySource backed by Vite's import.meta.glob.
 * Auto-discovers all .md files under src/stories.
 */

import type { StorySource } from './StorySource';

// `?raw` + `eager: true` returns the raw text content at build time.
// Stories live at the project root in `stories/` so contributors only touch content,
// never code. Vite is configured to allow reads from the project root.
const modules = import.meta.glob<string>('/stories/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export class ViteGlobStorySource implements StorySource {
  async loadAll(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [absPath, content] of Object.entries(modules)) {
      // /stories/01-forest/01-moon.md → 01-forest/01-moon.md
      const relPath = absPath.replace(/^\/stories\//, '');
      result[relPath] = content;
    }
    return result;
  }
}
