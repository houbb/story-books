<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStoryStore } from '@/stores/story';
import { useSettingsStore } from '@/stores/settings';
import { useAmbientAudio } from '@/composables/useAmbientAudio';

const router = useRouter();
const story = useStoryStore();
const settings = useSettingsStore();
const { index, loading, error } = storeToRefs(story);
const { lastPosition, theme } = storeToRefs(settings);
const { playing: musicPlaying, toggle: toggleMusic } = useAmbientAudio();

const ready = ref(false);

onMounted(async () => {
  await story.load();
  ready.value = true;
});

const bookTitle = computed(() => index.value?.book?.title ?? 'The Story Garden');
const bookSubtitle = computed(
  () => index.value?.book?.subtitle ?? '一座可以阅读的故事森林'
);
const storyCount = computed(() => index.value?.totalStories ?? 0);

const resume = computed(() => {
  const pos = lastPosition.value;
  if (!pos || !pos.storyId) return null;
  const meta = index.value?.byId[pos.storyId];
  return meta ? { title: meta.title, page: pos.page } : null;
});

function enter() {
  router.push('/read');
}
</script>

<template>
  <div class="home">
    <div class="home__bg paper-grain" />

    <header class="home__top">
      <span class="eyebrow">{{ bookTitle }}</span>
      <button class="home__theme" :aria-label="`切换到${theme === 'light' ? '夜间' : '日间'}模式`" @click="settings.toggleTheme()">
        <span v-if="theme === 'light'">☾</span>
        <span v-else>☼</span>
      </button>
      <button class="home__music" :aria-label="musicPlaying ? '暂停配乐' : '播放配乐'" @click="toggleMusic">
        <span class="home__music-bars" :class="{ 'is-playing': musicPlaying }"><i /><i /><i /></span>
        <span>{{ musicPlaying ? 'sound on' : 'sound off' }}</span>
      </button>
    </header>

    <main class="home__stage">
      <div class="home__copy fade-up">
        <h1 class="home__title display">{{ bookTitle }}</h1>
        <p class="home__subtitle title-cn">{{ bookSubtitle }}</p>
        <div class="home__rule" />
        <p class="caption home__caption" v-if="index?.book?.description">
          {{ index.book.description }}
        </p>
        <p class="caption home__caption" v-else>
          A digital storybook — open, choose a path, and read by the fire.
        </p>
      </div>

      <button class="home__cta" :disabled="!ready" @click="enter">
        <span class="home__cta-eyebrow eyebrow">Open the Book</span>
        <span class="home__cta-line" />
        <span class="home__cta-count">{{ storyCount }} stories</span>
      </button>

      <transition name="resume">
        <div v-if="resume" class="home__resume" @click="enter">
          <span class="eyebrow">Continue reading</span>
          <span class="home__resume-title">{{ resume.title }}</span>
          <span class="caption">Page {{ resume.page + 1 }}</span>
        </div>
      </transition>
    </main>

    <footer class="home__bottom">
      <span class="caption">✦  Press <kbd>Enter</kbd> to open</span>
      <span class="caption">{{ storyCount }} stories · {{ theme }}</span>
    </footer>

    <p v-if="loading" class="home__loading caption">Loading stories…</p>
    <p v-if="error" class="home__error caption">{{ error }}</p>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
  isolation: isolate;
}
.home__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 0%, var(--bg-paper), transparent 60%),
    radial-gradient(ellipse at 50% 100%, var(--bg-base), var(--bg-base));
  z-index: -1;
}
.home__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
}
.home__theme {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  display: grid;
  place-items: center;
  font-size: 16px;
  color: var(--ink-soft);
  transition: background var(--dur-fast) var(--ease-out);
}
.home__theme:hover {
  background: var(--bg-paper-deep);
}
.home__music {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 10px;
  font-family: var(--font-serif-en);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--muted);
  padding: 6px 10px;
  border-radius: var(--radius-pill);
}
.home__music:hover {
  background: var(--bg-paper-deep);
  color: var(--accent);
}
.home__music-bars {
  display: flex;
  gap: 2px;
  align-items: center;
  height: 14px;
}
.home__music-bars i {
  display: block;
  width: 2px;
  height: 7px;
  border-radius: 2px;
  background: currentColor;
}
.home__music-bars.is-playing i:nth-child(1) { animation: music-bar 700ms ease-in-out infinite alternate; }
.home__music-bars.is-playing i:nth-child(2) { animation: music-bar 700ms 180ms ease-in-out infinite alternate; }
.home__music-bars.is-playing i:nth-child(3) { animation: music-bar 700ms 340ms ease-in-out infinite alternate; }
@keyframes music-bar { to { height: 14px; } }
.home__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 56px;
  text-align: center;
  padding: 24px;
}
.home__copy {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
}
.home__title {
  font-size: clamp(48px, 9vw, 120px);
  margin: 0;
  letter-spacing: 0.06em;
}
.home__subtitle {
  font-size: clamp(18px, 2vw, 24px);
  margin: 0;
  color: var(--ink-soft);
  letter-spacing: 0.32em;
}
.home__rule {
  width: 96px;
  height: 1px;
  background: var(--accent-soft);
  opacity: 0.7;
  margin: 8px 0;
}
.home__caption {
  margin: 0;
  max-width: 480px;
}
.home__cta {
  position: relative;
  padding: 22px 56px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-paper);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  box-shadow: var(--shadow);
  transition:
    transform var(--dur-mid) var(--ease-out),
    box-shadow var(--dur-mid) var(--ease-out),
    border-color var(--dur-mid) var(--ease-out);
}
.home__cta:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow-deep);
}
.home__cta:disabled {
  opacity: 0.5;
  cursor: wait;
}
.home__cta-eyebrow {
  letter-spacing: 0.42em;
}
.home__cta-line {
  width: 64px;
  height: 1px;
  background: var(--accent);
  opacity: 0.7;
}
.home__cta-count {
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 13px;
  color: var(--muted);
}
.home__resume {
  margin-top: 8px;
  padding: 16px 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-paper);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  transition: background var(--dur-fast) var(--ease-out);
}
.home__resume:hover {
  background: var(--bg-paper-deep);
}
.home__resume-title {
  font-family: var(--font-serif-cn);
  font-size: 17px;
  font-weight: 600;
}
.resume-enter-active,
.resume-leave-active {
  transition: opacity 360ms var(--ease-out), transform 360ms var(--ease-out);
}
.resume-enter-from,
.resume-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.home__bottom {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}
.home__bottom kbd {
  font-family: var(--font-serif-en);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 12px;
  background: var(--bg-paper);
  margin: 0 4px;
}
.home__loading,
.home__error {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--muted);
}
.home__error {
  color: #a33;
}
</style>
