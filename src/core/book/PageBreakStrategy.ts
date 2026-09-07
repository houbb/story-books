/**
 * PageBreakStrategy — SPI interface for splitting story content into physical pages.
 *
 * Design principle:
 *   Interface first + Strategy pattern.
 *   Callers depend only on this contract, allowing future pluggable pagination strategies
 *   (e.g., CSS Columns, Canvas font-metric measure, DOM offscreen measure).
 */

export interface PageSlice {
  /** HTML chunk for this page */
  html: string;
  /** 0-based index of the slice within the story */
  sliceIndex: number;
  /** Total number of slices for this story */
  totalSlices: number;
  /** Approximate word count in this slice */
  approximateWords: number;
}

export interface PageBreakStrategy {
  /**
   * Splits a rendered HTML string or raw markdown content into sequential page slices.
   * @param html The fully rendered HTML of the story body.
   * @param maxCharsPerPage Approximate target character count per page (fallback heuristic).
   */
  split(html: string, maxCharsPerPage?: number): PageSlice[];
}

/**
 * ParagraphPageBreakStrategy — Default semantic break strategy.
 *
 * Breaks along semantic block elements (<p>, <blockquote>, <ul>, <ol>, <h3>, <h2>)
 * 采用自然适度的页面容量（默认 520 字符），让书页内容饱满充实，
 * 配合 CSS 原生 column-fill 与 overflow 控制，提供自然、简明、优雅的分页体验。
 */
/**
 * ParagraphPageBreakStrategy — 自然语义分片策略。
 *
 * 按照顶级 HTML 块（<p>, <blockquote>, <ul>, <ol>, <h3>, <h2>）进行自然分切，
 * 采用 300 字符基准容量，使每一页内容充实舒适，并且严格在页脚横线上方收笔，杜绝任何遮挡。
 */
export class ParagraphPageBreakStrategy implements PageBreakStrategy {
  private defaultMaxChars: number;

  constructor(defaultMaxChars = 300) {
    this.defaultMaxChars = defaultMaxChars;
  }

  split(html: string, maxCharsPerPage = this.defaultMaxChars): PageSlice[] {
    const pageLimit = Math.max(1, maxCharsPerPage);
    if (!html || html.trim() === '') {
      return [{ html: '', sliceIndex: 0, totalSlices: 1, approximateWords: 0 }];
    }

    const blockRegex = /<(p|blockquote|ul|ol|h[1-6]|hr|pre|table)[^>]*>[\s\S]*?<\/\1>|<hr\s*\/?>/gi;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        const between = html.slice(lastIndex, match.index).trim();
        if (between) blocks.push(between);
      }
      blocks.push(match[0]);
      lastIndex = blockRegex.lastIndex;
    }

    if (lastIndex < html.length) {
      const remainder = html.slice(lastIndex).trim();
      if (remainder) blocks.push(remainder);
    }

    if (blocks.length === 0) {
      blocks.push(html);
    }

    const pages: string[] = [];
    let currentChunk = '';
    let currentLength = 0;

    for (const block of blocks) {
      const textLen = block.replace(/<[^>]+>/g, '').length;
      const oversized = textLen > pageLimit && /^<p\b/i.test(block);
      const blockParts = oversized ? splitParagraph(block, pageLimit) : [block];

      for (const part of blockParts) {
        const partLength = part.replace(/<[^>]+>/g, '').length;

        // 精确遵循纯文本字符容量累加契约，不引入额外魔法加权
        if (currentLength + partLength > pageLimit && currentLength > 0) {
          pages.push(currentChunk);
          currentChunk = part;
          currentLength = partLength;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + part;
          currentLength += partLength;
        }
      }
    }

    if (currentChunk) {
      pages.push(currentChunk);
    }

    const total = pages.length;
    return pages.map((chunkHtml, idx) => {
      const text = chunkHtml.replace(/<[^>]+>/g, '');
      return {
        html: chunkHtml,
        sliceIndex: idx,
        totalSlices: total,
        approximateWords: text.length,
      };
    });
  }
}

/**
 * 智能句末断句切分，避免生硬在词语中间强行断开
 */
function splitParagraph(block: string, limit: number): string[] {
  const match = block.match(/^(<p\b[^>]*>)([\s\S]*?)(<\/p>)$/i);
  if (!match) return [block];
  const tagStart = match[1];
  const inner = match[2];
  const tagEnd = match[3];

  if (inner.length <= limit) return [block];

  const parts: string[] = [];
  let remaining = inner;

  while (remaining.length > limit) {
    // 优先在句号、感叹号、问号、分号等标点处断句（在 limit 宽容度 70%~100% 之间寻找）
    const searchSub = remaining.slice(0, limit);
    let splitPos = -1;
    const punctMatches = Array.from(searchSub.matchAll(/[。！？；!?;\n]/g));
    if (punctMatches.length > 0) {
      const lastPunct = punctMatches[punctMatches.length - 1];
      if (lastPunct.index !== undefined && lastPunct.index >= Math.floor(limit * 0.55)) {
        splitPos = lastPunct.index + 1;
      }
    }

    // 次选逗号等次级标点
    if (splitPos === -1) {
      const commaMatches = Array.from(searchSub.matchAll(/[，,、]/g));
      if (commaMatches.length > 0) {
        const lastComma = commaMatches[commaMatches.length - 1];
        if (lastComma.index !== undefined && lastComma.index >= Math.floor(limit * 0.6)) {
          splitPos = lastComma.index + 1;
        }
      }
    }

    if (splitPos === -1) {
      splitPos = limit;
    }

    parts.push(`${tagStart}${remaining.slice(0, splitPos).trim()}${tagEnd}`);
    remaining = remaining.slice(splitPos).trim();
  }

  if (remaining.length > 0) {
    parts.push(`${tagStart}${remaining}${tagEnd}`);
  }

  return parts;
}

export const defaultPageBreakStrategy = new ParagraphPageBreakStrategy();
