<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const visible = computed(() => router.currentRoute.value.path !== '/search');

function onKey(e: KeyboardEvent) {
  const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
  if (!isShortcut) return;
  if (e.target instanceof HTMLElement && /input|textarea/i.test(e.target.tagName)) {
    if (e.target instanceof HTMLInputElement && e.target.type === 'search') return;
  }
  e.preventDefault();
  router.push('/search');
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <button
    v-if="visible"
    class="search-fab"
    title="全文检索 (⌘K)"
    aria-label="全文检索"
    @click="router.push('/search')"
  >
    <span class="search-fab__icon">⌕</span>
    <span class="search-fab__text">检索 · Search</span>
    <span class="search-fab__hint">⌘K</span>
  </button>
</template>

<style scoped>
.search-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: var(--radius-pill);
  background: var(--bg-paper);
  color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  z-index: 50;
  transition: transform var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.search-fab:hover {
  transform: translateY(-2px);
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: var(--shadow-deep);
}
.search-fab__icon {
  font-size: 20px;
  color: var(--accent);
}
.search-fab__text {
  font-family: var(--font-serif-cn);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
}
.search-fab__hint {
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--muted);
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
@media (max-width: 540px) {
  .search-fab__text {
    display: none;
  }
}
</style>
