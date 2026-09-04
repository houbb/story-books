/**
 * StoryStats — pre-computes per-story and aggregate statistics.
 *
 * Lives behind an interface so a future "live word count from a CMS" backend
 * can swap in without touching the views.
 */

import type { StoryMeta } from './types';
import { wordCounter } from './WordCounter';

export interface StoryStat {
  storyId: string;
  title: string;
  path: string;
  parentId?: string;
  wordCount: number;
  readingMinutes: number;
}

export interface AggregateStats {
  totalWords: number;
  totalStories: number;
  totalMinutes: number;
  byParent: Array<{ parentId: string | null; title: string; words: number; stories: number }>;
  ranked: StoryStat[];
}

export interface StoryStatsProvider {
  compute(stories: StoryMeta[]): AggregateStats;
}

export const storyStatsProvider: StoryStatsProvider = {
  compute(stories) {
    const ranked: StoryStat[] = stories.map((s) => {
      const detail = wordCounter.detail(s.content);
      return {
        storyId: s.id,
        title: s.title,
        path: s.path,
        parentId: s.parentId,
        wordCount: detail.total,
        readingMinutes: detail.minutes,
      };
    });
    ranked.sort((a, b) => b.wordCount - a.wordCount);

    const totalWords = ranked.reduce((acc, r) => acc + r.wordCount, 0);
    const totalMinutes = ranked.reduce((acc, r) => acc + r.readingMinutes, 0);

    const groups = new Map<string | null, { title: string; words: number; stories: number }>();
    for (const s of stories) {
      const key = s.parentId ?? null;
      const detail = wordCounter.detail(s.content);
      const existing = groups.get(key);
      if (existing) {
        existing.words += detail.total;
        existing.stories += 1;
      } else {
        groups.set(key, {
          title: s.parentId ? s.parentId.split('/').pop() ?? s.parentId : '散章',
          words: detail.total,
          stories: 1,
        });
      }
    }

    return {
      totalWords,
      totalStories: ranked.length,
      totalMinutes,
      ranked,
      byParent: Array.from(groups.entries()).map(([parentId, v]) => ({ parentId, ...v })),
    };
  },
};
