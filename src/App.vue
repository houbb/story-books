<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useStoryStore } from '@/stores/story';

const settings = useSettingsStore();
const story = useStoryStore();

// Apply theme on first paint and whenever it changes
onMounted(() => {
  document.documentElement.dataset.theme = settings.theme;
  story.load();
});

watch(
  () => settings.theme,
  (t) => {
    document.documentElement.dataset.theme = t;
  }
);
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
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
