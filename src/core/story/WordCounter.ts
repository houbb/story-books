/**
 * WordCounter — turns a Markdown story body into a count.
 *
 * The default policy treats CJK ideographs as one word each (the natural unit
 * Chinese readers count) and lumps latin words by whitespace. Frontmatter is
 * stripped so author/title scaffolding never inflates the count.
 *
 * Anything that wants a different definition (e.g. pure-character count,
 * per-language split) only needs to implement `WordCounter` and re-register
 * it on the engine — no call site ever touches a concrete class.
 */

export interface WordCounter {
  count(body: string): number;
}

export interface WordCountDetail {
  total: number;
  cjk: number;
  latin: number;
  minutes: number;
}

const FRONTMATTER = /^---[\s\S]*?---\s*/;
const PUNCT_ONLY = /^[\s\p{P}\p{S}]+$/u;

function stripFrontmatter(body: string): string {
  return body.replace(FRONTMATTER, '').trim();
}

export const cjkWordCounter: WordCounter = {
  count(body: string): number {
    const text = stripFrontmatter(body);
    let cjk = 0;
    let latinWords = 0;
    let buffer = '';

    const flush = () => {
      if (buffer.trim().length > 0) latinWords += 1;
      buffer = '';
    };

    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0;
      const isCjk =
        (code >= 0x3400 && code <= 0x4dbf) || // Ext A
        (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
        (code >= 0xf900 && code <= 0xfaff) || // CJK Compat
        (code >= 0x20000 && code <= 0x2a6df); // Ext B-F
      if (isCjk) {
        flush();
        cjk += 1;
        continue;
      }
      if (/\s/.test(ch)) {
        flush();
        continue;
      }
      if (PUNCT_ONLY.test(ch)) continue;
      buffer += ch;
    }
    flush();

    return cjk + latinWords;
  },
};

export interface WordCounterEngine {
  count(body: string): number;
  detail(body: string): WordCountDetail;
}

export function createWordCounterEngine(counter: WordCounter = cjkWordCounter): WordCounterEngine {
  const detail = (body: string): WordCountDetail => {
    const text = stripFrontmatter(body);
    let cjk = 0;
    let latinWords = 0;
    let buffer = '';
    const flush = () => {
      if (buffer.trim().length > 0) latinWords += 1;
      buffer = '';
    };
    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0;
      const isCjk =
        (code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0x20000 && code <= 0x2a6df);
      if (isCjk) {
        flush();
        cjk += 1;
        continue;
      }
      if (/\s/.test(ch)) {
        flush();
        continue;
      }
      if (PUNCT_ONLY.test(ch)) continue;
      buffer += ch;
    }
    flush();
    const total = cjk + latinWords;
    // ~300 cjk chars / minute — a comfortable reading pace for narrative prose.
    const minutes = total === 0 ? 0 : Math.max(1, Math.round(total / 300));
    return { total, cjk, latin: latinWords, minutes };
  };

  return {
    count: (body) => counter.count(body),
    detail,
  };
}

export const wordCounter = createWordCounterEngine();
