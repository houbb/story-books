/**
 * MarkdownRenderer — turns Markdown content into sanitized HTML.
 * Wraps markdown-it with a curated, project-specific feature set.
 */

import MarkdownIt from 'markdown-it';
import type { StoryMeta } from '../story/types';

export interface RenderOptions {
  /** Base path to resolve relative image links like ./images/foo.jpg */
  basePath: string;
}

const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  linkify: true,
  typographer: true,
  quotes: '\u201c\u201d\u2018\u2019',
});

md.enable(['smartquotes', 'replacements', 'linkify']);

export class MarkdownRenderer {
  render(story: StoryMeta): string {
    const env: RenderOptions = { basePath: story.path };
    return md.render(story.content, env as unknown as MarkdownIt.Options);
  }
}

export const markdownRenderer = new MarkdownRenderer();
