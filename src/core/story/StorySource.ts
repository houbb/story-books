/**
 * StorySource — SPI for content providers.
 * Default impl reads from Vite `import.meta.glob`; plugins can replace.
 */

import type { RawStoryModule } from './types-internal';

export interface StorySource {
  /** All markdown modules keyed by relative path */
  loadAll(): Promise<Record<string, string>>;
}
