/**
 * PageFlipEngine — thin type-safe wrapper around the page-flip library.
 * The rest of the app depends on FlipInstance, never on page-flip directly.
 */

import { PageFlip } from 'page-flip';
import type { PageFlipSettings } from 'page-flip';

export type FlipDirection = 'forward' | 'backward';

export interface FlipSize {
  width: number;
  height: number;
}

export interface FlipInstance {
  loadFromHTML(pages: HTMLElement[]): void;
  flipNext(): void;
  flipPrev(): void;
  flip(page: number): void;
  getCurrentPageIndex(): number;
  getPageCount(): number;
  updateSize(size: FlipSize): void;
  destroy(): void;
  setOrientation(orientation: 'portrait' | 'landscape'): void;
  turnToPage(page: number): void;
  on(event: 'flip', handler: (e: unknown) => void): void;
  off(event: 'flip', handler: (e: unknown) => void): void;
}

/** Base settings that adapt to the viewport + reading mode */
export function baseFlipSettings(
  width: number,
  height: number,
  isMobile: boolean
): PageFlipSettings {
  const size = { width, height };
  return {
    width,
    height,
    size,
    showCover: true,
    autoSize: true,
    usePortrait: isMobile,
    flippingTime: isMobile ? 550 : 1000,
    maxShadowOpacity: 0.55,
    minWidth: 320,
    maxWidth: 1400,
    showPageCorners: true,
    drawShadow: true,
  };
}

/** Default implementation backed by page-flip (StPageFlip) */
export class StPageFlipEngine {
  create(el: HTMLDivElement, settings: PageFlipSettings): FlipInstance {
    const flip = new PageFlip(el, settings);
    return flip as unknown as FlipInstance;
  }
}

export const flipEngine = new StPageFlipEngine();