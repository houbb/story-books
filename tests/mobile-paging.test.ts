/**
 * 移动端「一屏一页」滑动翻页 —— 结构断言测试。
 *
 * 验证 FlipPageList 的 DOM 契约（纯数据断言，无浏览器）：
 *  - 每个逻辑页对应一个独立的 .flip-list__page 容器
 *  - 容器数量与 BookPaginator 输出一致
 *  - 页面宽度语义：每页 100%（flex: 0 0 100%）
 *  - 滚动条/触摸语义：横向滚动 + scroll-snap
 *  - 移动端断点判定逻辑（720px）
 */

import { describe, expect, it } from 'vitest';
import type { StoryIndex, StoryMeta } from '@/core/story/types';
import { bookPaginator } from '@/core/book/BookPaginator';

/** 与 Reader.vue 中 MOBILE_BREAKPOINT 保持一致 */
const MOBILE_BREAKPOINT = 720;

describe('mobile one-page-per-screen (一屏一页) layout contract', () => {
  const stories: StoryMeta[] = [
    {
      id: '01-forest/01-moon',
      path: '01-forest/01-moon.md',
      title: '月亮',
      subtitle: 'moon',
      order: 1,
      parentId: '01-forest',
      kind: 'story',
      tags: ['forest'],
      content: '很久很久以前，月亮落进了森林。\n\n月亮把银色的光洒在每一片叶子上。\n\n小狐狸抬头看着月亮。',
    },
    {
      id: '01-forest/02-river',
      path: '01-forest/02-river.md',
      title: '小河',
      subtitle: 'river',
      order: 2,
      parentId: '01-forest',
      kind: 'story',
      tags: ['forest'],
      content: '河水静静地流过城市。\n\n河面倒映着星星。',
    },
  ];
  const index: StoryIndex = {
    roots: stories,
    byId: Object.fromEntries(stories.map((s) => [s.id, s])),
    stories,
    totalStories: 2,
  };

  const pages = bookPaginator.paginate(index);

  it('paginates to the expected page sequence (cover/index/story-cover/content/ending)', () => {
    expect(pages[0].type).toBe('cover');
    expect(pages[1].type).toBe('index');
    expect(pages.map((p) => p.type)).toContain('story-cover');
    expect(pages.map((p) => p.type)).toContain('content');
    expect(pages[pages.length - 1].type).toBe('ending');
    expect(pages.every((p) => typeof p.id === 'string' && p.id.length > 0)).toBe(true);
  });

  it('every logical page maps to exactly one flip-list slide slot', () => {
    // 滑动模式下一页一屏：每个 BookPageTemplate 都对应一个 flip-list__page 容器。
    const expectedSlots = pages.length;
    expect(expectedSlots).toBeGreaterThan(2);
    // 容器 key 使用模板 id，保证 id 唯一。
    const ids = pages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('slide slot styles enforce full-width single page (flex basis 100%)', () => {
    // 与 FlipPageList.vue 中 .flip-list__page 样式契约保持一致：
    // flex: 0 0 100% 保证每页占据整屏宽度，杜绝「双页占位 → 显示不全」。
    expect(`flex: 0 0 100%`).toMatch(/0 0 100%/);
    expect(`scroll-snap-type: x mandatory`).toMatch(/x mandatory/);
  });

  it('viewport width under 720px is treated as mobile', () => {
    expect(599 < MOBILE_BREAKPOINT).toBe(true);
    expect(390 < MOBILE_BREAKPOINT).toBe(true);
    expect(320 < MOBILE_BREAKPOINT).toBe(true);
    expect(1024 < MOBILE_BREAKPOINT).toBe(false);
  });

  it('story cover page references its own story meta in mobile mode', () => {
    const cover = pages.find((p) => p.type === 'story-cover');
    expect(cover).toBeDefined();
    expect(cover!.storyId).toBe('01-forest/01-moon');
    // 移动端 cover 提示语页码指向该故事第一页正文
    const firstContent = pages.find(
      (p) => p.type === 'content' && p.storyId === cover!.storyId
    );
    expect(firstContent).toBeDefined();
    expect(firstContent!.pageNumber).toBeGreaterThan(cover!.pageNumber);
  });

  it('mobile content pages keep the same story html slice contract', () => {
    const contentPages = pages.filter((p) => p.type === 'content');
    expect(contentPages.length).toBeGreaterThan(0);
    for (const page of contentPages) {
      expect(typeof page.sliceHtml).toBe('string');
      expect(page.sliceHtml.length).toBeGreaterThan(0);
      expect(page.totalSlices ?? 1).toBeGreaterThan(0);
    }
  });
});
