import { onBeforeUnmount, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';

/** Small, offline ambient loop. Audio only starts after an explicit user gesture. */
export function useAmbientAudio() {
  const settings = useSettingsStore();
  const playing = ref(false);
  const audio = new Audio('/audio/story-garden-loop.wav');
  audio.loop = true;
  audio.volume = 0.16;

  audio.addEventListener('play', () => (playing.value = true));
  audio.addEventListener('pause', () => (playing.value = false));
  audio.addEventListener('ended', () => (playing.value = false));

  async function toggle() {
    if (audio.paused) {
      try {
        await audio.play();
        settings.soundEnabled = true;
      } catch {
        // Browser autoplay policy or unavailable audio is non-fatal.
      }
    } else {
      audio.pause();
      settings.soundEnabled = false;
    }
  }

  watch(
    () => settings.soundEnabled,
    (enabled) => {
      if (!enabled && !audio.paused) audio.pause();
    }
  );

  onBeforeUnmount(() => {
    audio.pause();
    audio.src = '';
  });

  return { playing, toggle };
}
