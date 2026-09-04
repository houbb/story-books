/**
 * Minimal type shim for `page-flip` (StPageFlip v2).
 * The library ships only a browser bundle without .d.ts.
 */

declare module 'page-flip' {
  export type PageRender = 'canvas' | 'html';

  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    render?: PageRender;
    showCover?: boolean;
    usePortrait?: boolean;
    flippingTime?: number;
    maxShadowOpacity?: number;
    minWidth?: number;
    maxWidth?: number;
    showPageCorners?: boolean;
    autoSize?: boolean;
    clickEventForward?: boolean;
    swipeDistance?: number;
    drawShadow?: boolean;
  }

  export type FlipEvent =
    | 'changeState'
    | 'flip'
    | 'changeOrientation'
    | 'init'
    | 'update'
    | 'resize';

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(pages: HTMLElement[]): void;
    loadFromImages(images: string[]): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    flip(page: number, corner?: string): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    setOrientation(orientation: 'portrait' | 'landscape'): void;
    updateSize(size: { width: number; height: number }): void;
    destroy(): void;
    on(event: FlipEvent, handler: (e: unknown) => void): void;
    off(event: FlipEvent, handler: (e: unknown) => void): void;
  }

  export class HTMLFlipBook extends PageFlip {}

  const HTMLFlipBookCtor: typeof HTMLFlipBook;
  export default HTMLFlipBookCtor;
}
