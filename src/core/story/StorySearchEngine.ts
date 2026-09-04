/**
 * StorySearchEngine — light-weight in-memory full-text search over StoryIndex.
 *
 * Goals:
 *   - Pure-browser, zero dependencies.
 *   - Acceptable on a few hundred stories (the realistic ceiling for a small
 *     digital storybook). Linear scans plus per-token filtering are fine.
 *   - Tokenizer is intentionally simple: lowercase + CJK bigram + latin word.
 *
 * Designed as an interface first so a future contributor can swap in
 * lunr/minisearch without touching callers.
 */

import type { StoryMeta } from './types';
import { stripLeadingH1 } from './StoryParser';
import { wordCounter } from './WordCounter';

export interface SearchHit {
  storyId: string;
  /** Where in the body the match was found, for snippet rendering. */
  snippet: string;
  /** Match position (char offset in the searchable text) */
  charIndex: number;
  /** Number of token occurrences across the document */
  occurrences: number;
}

export interface ScoredHit extends SearchHit {
  score: number;
  titleScore: number;
}

export interface StorySearchEngine {
  index(stories: StoryMeta[]): void;
  search(query: string, limit?: number): ScoredHit[];
}

interface IndexedDoc {
  story: StoryMeta;
  /** Lowercased searchable text (title + body, no frontmatter, no heading). */
  text: string;
  /** Tokens for latin words (lowercased). */
  tokens: Set<string>;
  /** CJK bigrams. */
  bigrams: Set<string>;
  /** Title-only text. */
  titleText: string;
  /** Title tokens + bigrams. */
  titleTokens: Set<string>;
  titleBigrams: Set<string>;
}

function tokenizeLatin(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2);
}

function bigramsOf(input: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < input.length - 1; i += 1) {
    const a = input.charAt(i);
    const b = input.charAt(i + 1);
    if (/\s/.test(a) || /\s/.test(b)) continue;
    out.push(a + b);
  }
  return out;
}

function makeExcerpt(text: string, index: number, query: string, radius = 32): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  const slice = text.slice(start, end);
  const lower = slice.toLowerCase();
  const q = query.toLowerCase();
  const at = lower.indexOf(q);
  const hl =
    at >= 0 ? slice.slice(0, at) + '«' + slice.slice(at, at + q.length) + '»' + slice.slice(at + q.length) : slice;
  return prefix + hl.replace(/\s+/g, ' ').trim() + suffix;
}

export const storySearchEngine: StorySearchEngine = {
  index(stories) {
    const docs: IndexedDoc[] = stories.map((story) => {
      const body = stripLeadingH1(story.content, story.title);
      const text = (story.title + '\n' + body).toLowerCase();
      const titleText = story.title.toLowerCase();
      return {
        story,
        text,
        tokens: new Set(tokenizeLatin(body)),
        bigrams: new Set(bigramsOf(body)),
        titleText,
        titleTokens: new Set(tokenizeLatin(story.title)),
        titleBigrams: new Set(bigramsOf(story.title)),
      };
    });
    this['_docs'] = docs;
  },

  search(rawQuery, limit = 20) {
    const docs: IndexedDoc[] = this['_docs'] ?? [];
    if (!rawQuery || !rawQuery.trim()) return [];
    const query = rawQuery.trim().toLowerCase();

    const isAscii = /^[\x00-\x7f]+$/.test(query);
    const hits: ScoredHit[] = [];

    for (const doc of docs) {
      let titleScore = 0;
      if (doc.titleText.includes(query)) titleScore += 10;
      if (doc.titleTokens.has(query)) titleScore += 6;
      if (doc.titleBigrams.has(query)) titleScore += 3;

      const occurrences = isAscii
        ? occurrencesOf(doc.text, query)
        : doc.bigrams.has(query)
          ? 1
          : 0;

      if (titleScore === 0 && occurrences === 0) continue;

      const charIndex = doc.text.indexOf(query);
      const snippet = charIndex >= 0 ? makeExcerpt(doc.text, charIndex, query) : doc.story.title;
      const score = titleScore * 4 + occurrences * 2 + wordCounter.count(doc.story.content) > 0 ? 0 : 0;

      hits.push({
        storyId: doc.story.id,
        snippet,
        charIndex,
        occurrences: titleScore > 0 ? Math.max(occurrences, 1) : occurrences,
        score: titleScore * 4 + occurrences,
        titleScore,
      });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as StorySearchEngine & { _docs?: IndexedDoc[] };

function occurrencesOf(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    count += 1;
    from = at + needle.length;
  }
  return count;
}
