import type { CjkFont, LatinFont } from '@/stores/settings';

/** Single source of truth for the CSS font-family stacks each option renders with. */
export function cjkFontFamily(font: CjkFont): string {
  switch (font) {
    case 'wenkai':
      return "'LXGW WenKai Screen', 'Noto Serif SC', serif";
    case 'noto':
      return "'Noto Serif SC', 'LXGW WenKai Screen', serif";
    case 'songti':
      return "'STSong', 'SimSun', 'Songti SC', serif";
  }
}

export function latinFontFamily(font: LatinFont): string {
  switch (font) {
    case 'cormorant':
      return "'Cormorant Garamond', 'EB Garamond', Georgia, serif";
    case 'inter':
      return "'Inter', 'EB Garamond', Georgia, serif";
    case 'georgia':
      return "Georgia, 'EB Garamond', serif";
  }
}
