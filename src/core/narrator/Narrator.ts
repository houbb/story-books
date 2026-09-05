/**
 * Narrator — SPI for text-to-speech reading.
 * Uses Web Speech API as default implementation, swappable for cloud TTS plugins.
 */

export interface NarratorOptions {
  rate?: number; // 0.8 - 1.5
  pitch?: number;
  lang?: string;
}

export interface Narrator {
  speak(text: string, options?: NarratorOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isPlaying(): boolean;
  onEnd(callback: () => void): void;
}

export class WebSpeechNarrator implements Narrator {
  private endCallback: (() => void) | null = null;
  private playing = false;
  private requestId = 0;

  speak(text: string, options: NarratorOptions = {}): Promise<void> {
    const requestId = ++this.requestId;
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const plainText = text.replace(/<[^>]+>/g, '').trim();
      if (!plainText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = options.lang || 'zh-CN';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      utterance.onstart = () => {
        this.playing = true;
      };

      utterance.onend = () => {
        if (requestId !== this.requestId) { resolve(); return; }
        this.playing = false;
        if (this.endCallback) this.endCallback();
        resolve();
      };

      utterance.onerror = () => {
        if (requestId !== this.requestId) { resolve(); return; }
        this.playing = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  pause(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    this.requestId++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.playing = false;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  onEnd(callback: () => void): void {
    this.endCallback = callback;
  }
}

export const webSpeechNarrator = new WebSpeechNarrator();
