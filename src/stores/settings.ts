/**
 * settings — persisted user preferences.
 * theme / font family / font size / last position (resume reading).
 */

import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'night';

export type CjkFont = 'wenkai' | 'noto' | 'songti';
export type LatinFont = 'cormorant' | 'inter' | 'georgia';

export interface ReadingPosition {
  storyId: string | null;
  /** Logical page number (BookPageTemplate index) */
  page: number;
  updatedAt: number;
}

const STORAGE_KEY = 'storybook-engine:settings';
const MAX_POSITIONS = 50;

export interface SettingsState {
  theme: ThemeMode;
  fontSize: number;
  cjkFont: CjkFont;
  latinFont: LatinFont;
  lastPosition: ReadingPosition | null;
  /** storyId → last page, most recent first */
  history: ReadingPosition[];
  soundEnabled: boolean;
}

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { ...defaults(), ...parsed };
  } catch {
    return defaults();
  }
}

function defaults(): SettingsState {
  return {
    theme: 'light',
    fontSize: 15,
    cjkFont: 'wenkai',
    latinFont: 'cormorant',
    lastPosition: null,
    history: [],
    soundEnabled: false,
  };
}

function save(state: SettingsState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: state.theme,
        fontSize: state.fontSize,
        cjkFont: state.cjkFont,
        latinFont: state.latinFont,
        lastPosition: state.lastPosition,
        history: state.history,
        soundEnabled: state.soundEnabled,
      })
    );
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => load(),
  actions: {
    setTheme(theme: ThemeMode) {
      this.theme = theme;
      document.documentElement.dataset.theme = theme;
      save(this.$state);
    },
    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'night' : 'light');
    },
    setFontSize(size: number) {
      this.fontSize = Math.min(20, Math.max(13, size));
      save(this.$state);
    },
    setCjkFont(font: CjkFont) {
      this.cjkFont = font;
      save(this.$state);
    },
    setLatinFont(font: LatinFont) {
      this.latinFont = font;
      save(this.$state);
    },
    recordReading(storyId: string | null, page: number) {
      this.lastPosition = { storyId, page, updatedAt: Date.now() };
      if (storyId) {
        const filtered = this.history.filter((h) => h.storyId !== storyId);
        filtered.unshift({ storyId, page, updatedAt: Date.now() });
        this.history = filtered.slice(0, MAX_POSITIONS);
      }
      save(this.$state);
    },
    clearPosition() {
      this.lastPosition = null;
      save(this.$state);
    },
  },
});
