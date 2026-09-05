<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useSettingsStore, applyThemeToDOM } from '@/stores/settings';
import { useStoryStore } from '@/stores/story';
import SearchFab from '@/components/SearchFab.vue';

const settings = useSettingsStore();
const story = useStoryStore();

settings.initThemeListener();

function applyDocumentState() {
  const root = document.documentElement;
  applyThemeToDOM(settings.theme);
  root.dataset.cjkFont = settings.cjkFont;
  root.dataset.latinFont = settings.latinFont;
  root.dataset.fontSize = String(settings.fontSize);
}

onMounted(() => {
  applyDocumentState();
  story.load();
});

watch(
  () => [
    settings.theme,
    settings.cjkFont,
    settings.latinFont,
    settings.fontSize,
  ],
  () => applyDocumentState()
);
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
  <SearchFab />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 320ms var(--ease-out), transform 320ms var(--ease-out);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
