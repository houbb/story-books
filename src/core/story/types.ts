/**
 * Story Engine — domain model & types
 *
 * Markdown is the source, but StoryDocument is the contract.
 * No consumer should ever touch raw Markdown.
 */

export type StoryKind = 'prologue' | 'story' | 'chapter' | 'ending' | 'index';

export interface StoryMeta {
  id: string;
  /** Absolute file path relative to stories root, e.g. "01-forest/01-moon.md" */
  path: string;
  /** Title — defaults to first heading or filename */
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  cover?: string;
  description?: string;
  tags?: string[];
  order: number;
  /** Parent group/folder path, e.g. "01-forest" or "" for root */
  parentId?: string;
  kind: StoryKind;
  /** Raw markdown content */
  content: string;
}

export interface StoryGroup {
  id: string;
  title: string;
  order: number;
  children: StoryDocument[];
}

export type StoryDocument = StoryMeta | StoryGroup;

export function isStoryGroup(node: StoryDocument): node is StoryGroup {
  return (node as StoryGroup).children !== undefined;
}

export interface StoryIndex {
  /** Root stories/groups sorted by order */
  roots: StoryDocument[];
  /** Flat lookup by id */
  byId: Record<string, StoryMeta>;
  /** All stories that count as a chapter (any leaf story) */
  stories: StoryMeta[];
  /** Book metadata from stories/index.md frontmatter */
  book?: StoryMeta;
  /** Total leaf story count */
  totalStories: number;
}
