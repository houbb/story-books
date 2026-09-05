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
 * rather than hard-splitting arbitrary tags, preventing broken HTML tags or split paragraphs.
 */
export class ParagraphPageBreakStrategy implements PageBreakStrategy {
  private defaultMaxChars: number;

  constructor(defaultMaxChars = 650) {
    this.defaultMaxChars = defaultMaxChars;
  }

  split(html: string, maxCharsPerPage = this.defaultMaxChars): PageSlice[] {
    const pageLimit = Math.max(1, maxCharsPerPage);
    if (!html || html.trim() === '') {
      return [{ html: '', sliceIndex: 0, totalSlices: 1, approximateWords: 0 }];
    }

    maxCharsPerPage = pageLimit;
    // Match top-level HTML blocks
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

    // If regex found no blocks, fallback to the entire HTML
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
        // If adding this block exceeds target length and we already have content, push current chunk
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

function splitParagraph(block: string, limit: number): string[] {
  const match = block.match(/^(<p\b[^>]*>)([\s\S]*?)(<\/p>)$/i);
  if (!match) return [block];
  const parts: string[] = [];
  for (let offset = 0; offset < match[2].length; offset += limit) {
    parts.push(`${match[1]}${match[2].slice(offset, offset + limit)}${match[3]}`);
  }
  return parts;
}

export const defaultPageBreakStrategy = new ParagraphPageBreakStrategy();
