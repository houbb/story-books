/**
 * MarkdownRenderer — turns Markdown into HTML for the Reader.
 *
 * The Reader passes the rendered HTML into page-flip's HTML mode. We do not
 * compile Markdown into Vue components — StoryDocument is the contract.
 */

import MarkdownIt from 'markdown-it';
import type { StoryMeta } from '../story/types';

export interface RenderResult {
  html: string;
  /** Approximate excerpt shown on covers / TOC previews */
  excerpt: string;
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

/** Replace the leading `# Title` if frontmatter already supplies one. */
function stripLeadingH1(content: string, title?: string): string {
  if (!title) return content;
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    lines.splice(i, 1);
  }
  return lines.join('\n').trim();
}

function makeExcerpt(content: string, max = 80): string {
  const text = content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export class MarkdownRenderer {
  render(story: StoryMeta): RenderResult {
    const body = stripLeadingH1(story.content, story.title);
    const html = md.render(body);
    return { html, excerpt: makeExcerpt(story.content) };
  }
}

export const markdownRenderer = new MarkdownRenderer();
