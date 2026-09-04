/**
 * StoryParser — turns raw Markdown + frontmatter into StoryMeta.
 * Pure function: same input → same output, no side effects.
 */

import matter from 'gray-matter';
import type { StoryKind, StoryMeta } from './types';

export interface ParsedFrontmatter {
  title?: string;
  subtitle?: string;
  author?: string;
  date?: string;
  cover?: string;
  description?: string;
  tags?: string[];
  order?: number;
  type?: StoryKind;
}

const KIND_RULES: Array<{ match: RegExp; kind: StoryKind }> = [
  { match: /^index\.md$/i, kind: 'index' },
  { match: /^(00|prologue|序章|序)\b/i, kind: 'prologue' },
  { match: /(ending|尾声|end|99)\b/i, kind: 'ending' },
];

function inferKind(path: string): StoryKind {
  const file = path.split('/').pop() ?? path;
  for (const rule of KIND_RULES) {
    if (rule.match.test(file)) return rule.kind;
  }
  return 'story';
}

function extractLeadingTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim();
}

export function stripLeadingH1(content: string, title?: string): string {
  if (!title) return content;
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    lines.splice(i, 1);
  }
  return lines.join('\n').trim();
}

function fileBaseName(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.md$/i, '');
}

function deriveTitleFromFilename(name: string): string {
  // 01-fox-in-the-rain → Fox in the rain
  // 月亮 → 月亮
  const noPrefix = name.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').trim();
  if (!noPrefix) return name;
  if (/^[a-z]/.test(noPrefix)) {
    return noPrefix
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
  return noPrefix;
}

function inferParentId(path: string): string | undefined {
  const parts = path.split('/');
  if (parts.length <= 1) return undefined;
  parts.pop();
  return parts.join('/');
}

export function parseStory(relPath: string, raw: string): StoryMeta {
  const { data, content } = matter(raw);
  const fm = data as ParsedFrontmatter;

  const fileBase = fileBaseName(relPath);
  const title =
    fm.title ?? extractLeadingTitle(content) ?? deriveTitleFromFilename(fileBase);

  const orderMatch = fileBase.match(/^(\d+)[-_]/);
  const order = fm.order ?? (orderMatch ? Number(orderMatch[1]) : 999);

  const id = relPath.replace(/\.md$/i, '');

  const meta: StoryMeta = {
    id,
    path: relPath,
    title,
    subtitle: fm.subtitle,
    author: fm.author,
    date: fm.date,
    cover: fm.cover,
    description: fm.description,
    tags: fm.tags,
    order,
    parentId: inferParentId(relPath),
    kind: fm.type ?? inferKind(relPath),
    content,
  };

  return meta;
}
