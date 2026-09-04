/**
 * StoryTreeBuilder — assembles flat StoryMeta list into a tree of StoryGroups/StoryMeta.
 * Pure: takes input, returns immutable output.
 */

import { isStoryGroup } from './types';
import type { StoryDocument, StoryGroup, StoryMeta } from './types';

function sortByOrder(a: StoryDocument, b: StoryDocument): number {
  return a.order - b.order;
}

export function buildTree(stories: StoryMeta[]): StoryDocument[] {
  if (stories.length === 0) return [];

  const rootMetas: StoryMeta[] = [];
  const groupMetas: StoryMeta[] = [];
  for (const s of stories) {
    if (s.parentId === undefined || s.parentId === '') {
      rootMetas.push(s);
    } else {
      groupMetas.push(s);
    }
  }

  const groupIds = new Set<string>();
  const groups = new Map<string, StoryGroup>();
  for (const s of [...rootMetas, ...groupMetas]) {
    if (s.kind === 'index') continue;
    if (s.parentId) groupIds.add(s.parentId);
  }

  // Build folders as groups for any parentId that has children
  for (const id of groupIds) {
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        title: titleFromPath(id),
        order: orderFromPath(id),
        children: [],
      });
    }
  }

  // Attach children (skip index.md — it's metadata, not a child node)
  for (const s of stories) {
    if (s.kind === 'index') continue;
    if (s.parentId && groups.has(s.parentId)) {
      groups.get(s.parentId)!.children.push(s);
    }
  }

  const roots: StoryDocument[] = [];
  for (const r of rootMetas) {
    if (r.kind !== 'index') roots.push(r);
  }
  for (const g of groups.values()) {
    g.children.sort(sortByOrder);
    roots.push(g);
  }

  roots.sort(sortByOrder);
  return roots;
}

function titleFromPath(path: string): string {
  const seg = path.split('/').pop() ?? path;
  return seg.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ');
}

function orderFromPath(path: string): number {
  const seg = path.split('/').pop() ?? path;
  const m = seg.match(/^(\d+)[-_]/);
  return m ? Number(m[1]) : 999;
}

export function flattenStories(roots: StoryDocument[]): StoryMeta[] {
  const out: StoryMeta[] = [];
  for (const r of roots) {
    if (isStoryGroup(r)) {
      out.push(...r.children);
    } else {
      out.push(r);
    }
  }
  return out;
}
