<script setup lang="ts">
/**
 * SettingsPanel — font/theme controls.
 *
 * Backed by the SettingsStore; this component never reaches into localStorage
 * directly so any future preference migrates through one well-known seam.
 */
import { useSettingsStore } from '@/stores/settings';
import type { CjkFont, LatinFont, ThemeMode } from '@/stores/settings';
import { cjkFontFamily, latinFontFamily } from '@/styles/font-stacks';

const settings = useSettingsStore();

const cjkOptions: Array<{ value: CjkFont; label: string; sample: string }> = [
  { value: 'wenkai', label: '霞鹜文楷', sample: 'LXGW WenKai · 轻盈人文' },
  { value: 'noto', label: '思源宋体', sample: 'Noto Serif SC · 标准阅读' },
  { value: 'songti', label: '系统宋体', sample: 'STSong · 系统默认' },
];

const latinOptions: Array<{ value: LatinFont; label: string; sample: string }> = [
  { value: 'cormorant', label: 'Cormorant', sample: 'Cormorant · editorial italic' },
  { value: 'inter', label: 'Inter', sample: 'Inter · clean modern' },
  { value: 'georgia', label: 'Georgia', sample: 'Georgia · sturdy screen' },
];

const themeOptions: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'light', label: '日间', description: '温暖纸张' },
  { value: 'night', label: '夜间', description: '低亮护眼' },
  { value: 'auto', label: '自动', description: '跟随系统' },
];

const fontSizes: Array<{ value: number; label: string }> = [
  { value: 13, label: 'S' },
  { value: 15, label: 'M' },
  { value: 17, label: 'L' },
  { value: 19, label: 'XL' },
];

const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <div class="settings" role="dialog" aria-modal="true" aria-label="阅读设置">
    <header class="settings__head">
      <span class="eyebrow">Reading Settings · 阅读偏好</span>
      <button class="settings__close" @click="emit('close')">✕</button>
    </header>

    <section class="settings__section">
      <p class="eyebrow">主题 · theme</p>
      <div class="settings__seg settings__theme-seg">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          class="settings__seg-btn"
          :class="{ 'is-active': settings.theme === opt.value }"
          :aria-pressed="settings.theme === opt.value"
          @click="settings.setTheme(opt.value)"
        >
          <span class="settings__seg-letter">{{ opt.label }}</span>
          <span class="settings__seg-sample">{{ opt.description }}</span>
        </button>
      </div>
    </section>

    <section class="settings__section">
      <p class="eyebrow">字号 · font size</p>
      <div class="settings__seg">
        <button
          v-for="opt in fontSizes"
          :key="opt.value"
          class="settings__seg-btn"
          :class="{ 'is-active': settings.fontSize === opt.value }"
          @click="settings.setFontSize(opt.value)"
        >
          <span class="settings__seg-letter">{{ opt.label }}</span>
          <span class="settings__seg-sample" :style="{ fontSize: `${opt.value}px` }">Aa</span>
        </button>
      </div>
    </section>

    <section class="settings__section">
      <p class="eyebrow">中文字体 · Chinese</p>
      <div class="settings__cards">
        <button
          v-for="opt in cjkOptions"
          :key="opt.value"
          class="settings__card"
          :class="{ 'is-active': settings.cjkFont === opt.value }"
          :style="{ fontFamily: cjkFontFamily(opt.value) }"
          @click="settings.setCjkFont(opt.value)"
        >
          <span class="settings__card-label">{{ opt.label }}</span>
          <span class="settings__card-sample">{{ opt.sample }}</span>
          <span class="settings__card-preview">故事森林的清晨</span>
        </button>
      </div>
    </section>

    <section class="settings__section">
      <p class="eyebrow">英文字体 · Latin</p>
      <div class="settings__cards">
        <button
          v-for="opt in latinOptions"
          :key="opt.value"
          class="settings__card"
          :class="{ 'is-active': settings.latinFont === opt.value }"
          :style="{ fontFamily: latinFontFamily(opt.value) }"
          @click="settings.setLatinFont(opt.value)"
        >
          <span class="settings__card-label">{{ opt.label }}</span>
          <span class="settings__card-sample">{{ opt.sample }}</span>
          <span class="settings__card-preview">A Quiet Story Garden</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings {
  width: min(560px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  background: var(--bg-paper);
  color: var(--ink);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-deep);
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.settings__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.settings__close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 14px;
}
.settings__close:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.settings__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.settings__seg {
  display: flex;
  gap: 8px;
}
.settings__seg-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-paper);
  color: var(--ink-soft);
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.settings__seg-btn:hover {
  border-color: var(--accent);
}
.settings__seg-btn.is-active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-paper-deep);
}
.settings__seg-letter {
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.18em;
}
.settings__cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.settings__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-paper);
  text-align: left;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.settings__card:hover {
  border-color: var(--accent);
}
.settings__card.is-active {
  border-color: var(--accent);
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.settings__card-label {
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: inherit;
}
.settings__card-sample {
  font-size: 11px;
  color: var(--muted);
}
.settings__card-preview {
  font-size: 16px;
  margin-top: 4px;
  color: var(--ink);
}
@media (max-width: 540px) {
  .settings__cards {
    grid-template-columns: 1fr;
  }
}
</style>
