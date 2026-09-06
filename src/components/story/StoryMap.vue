<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { VueFlow, Position, useVueFlow, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { isStoryGroup } from '@/core/story/types';
import type { StoryDocument } from '@/core/story/types';
import { wordCounter } from '@/core/story/WordCounter';

const emit = defineEmits<{
  (e: 'pick', id: string): void;
}>();

const story = useStoryStore();
const book = useBookStore();
const { fitView, setCenter, zoomIn, zoomOut } = useVueFlow();

interface PositionedNode extends Node {
  id: string;
  label: string;
  position: { x: number; y: number };
  data: {
    kind: 'root' | 'group' | 'story';
    visited: boolean;
    isCurrent: boolean;
    order?: number;
    words?: number;
    minutes?: number;
    parentTitle?: string;
  };
}

function emptyGroupData(): PositionedNode['data'] {
  return { kind: 'group', visited: false, isCurrent: false };
}

const stats = computed(() => {
  const idx = story.index;
  if (!idx) return new Map<string, { words: number; minutes: number }>();
  const map = new Map<string, { words: number; minutes: number }>();
  for (const s of idx.stories) {
    const detail = wordCounter.detail(s.content);
    map.set(s.id, { words: detail.total, minutes: detail.minutes });
  }
  return map;
});

const layout = computed<{ nodes: PositionedNode[]; edges: Edge[] }>(() => {
  const idx = story.index;
  if (!idx) return { nodes: [], edges: [] };
  const roots = idx.roots;
  const visited = new Set(story.visited);
  const currentId = book.currentStoryId;

  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];

  const columnWidth = 260;
  const rowHeight = 150;
  const groupHeaderHeight = 85;

  // Check if stories are mostly root stories (flat structure like 34 root chapters)
  const isMostlyFlat = roots.every((r) => !isStoryGroup(r));

  if (isMostlyFlat) {
    // Elegant grid layout for flat stories: 5 columns per row, serpentine reading flow
    const cols = 5;
    const sorted = [...roots].sort((a, b) => a.order - b.order);

    sorted.forEach((root, i) => {
      const row = Math.floor(i / cols);
      const isReversedRow = row % 2 === 1;
      const col = isReversedRow ? cols - 1 - (i % cols) : i % cols;
      const x = col * columnWidth;
      const y = row * rowHeight;
      const isCurrent = root.id === currentId;
      const stat = stats.value.get(root.id);

      nodes.push({
        id: `s:${root.id}`,
        type: 'default',
        label: root.title,
        position: { x, y },
        data: {
          kind: 'story',
          visited: visited.has(root.id),
          isCurrent,
          order: root.order,
          words: stat?.words,
          minutes: stat?.minutes,
          parentTitle: 'Chapter',
        },
        sourcePosition: isReversedRow ? Position.Left : Position.Right,
        targetPosition: isReversedRow ? Position.Right : Position.Left,
      });

      if (i > 0) {
        const prev = sorted[i - 1];
        edges.push({
          id: `e:flow:${prev.id}->${root.id}`,
          source: `s:${prev.id}`,
          target: `s:${root.id}`,
          animated: isCurrent,
          type: 'smoothstep',
          style: {
            stroke: isCurrent ? 'var(--accent)' : 'var(--accent-soft)',
            strokeWidth: isCurrent ? 2 : 1,
            strokeDasharray: '4 4',
            opacity: isCurrent ? 1 : 0.65,
          },
        });
      }
    });

    return { nodes, edges };
  }

  // Hierarchical layout with folder groups
  const sorted = [...roots].sort((a, b) => {
    const aOrder = isStoryGroup(a) ? a.children[0]?.order ?? 999 : a.order;
    const bOrder = isStoryGroup(b) ? b.children[0]?.order ?? 999 : b.order;
    return aOrder - bOrder;
  });

  sorted.forEach((root, ci) => {
    if (isStoryGroup(root)) {
      const groupX = ci * columnWidth;
      const groupY = 0;
      nodes.push({
        id: `g:${root.id}`,
        type: 'default',
        label: root.title,
        position: { x: groupX, y: groupY },
        data: emptyGroupData(),
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      root.children.forEach((child, ri) => {
        const x = groupX;
        const y = groupHeaderHeight + ri * rowHeight;
        const isCurrent = child.id === currentId;
        const stat = stats.value.get(child.id);
        nodes.push({
          id: `s:${child.id}`,
          type: 'default',
          label: child.title,
          position: { x, y },
          data: {
            kind: 'story',
            visited: visited.has(child.id),
            isCurrent,
            order: child.order,
            words: stat?.words,
            minutes: stat?.minutes,
            parentTitle: root.title,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
        edges.push({
          id: `e:g:${root.id}->s:${child.id}`,
          source: `g:${root.id}`,
          target: `s:${child.id}`,
          animated: isCurrent,
          type: 'smoothstep',
        });
      });
    } else {
      const x = ci * columnWidth;
      const y = 0;
      const isCurrent = root.id === currentId;
      const stat = stats.value.get(root.id);
      nodes.push({
        id: `s:${root.id}`,
        type: 'default',
        label: root.title,
        position: { x, y },
        data: {
          kind: 'story',
          visited: visited.has(root.id),
          isCurrent,
          order: root.order,
          words: stat?.words,
          minutes: stat?.minutes,
          parentTitle: '序章',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    }
  });

  // Reading-order flow
  const flatIds: string[] = [];
  sorted.forEach((r) => {
    if (isStoryGroup(r)) r.children.forEach((c) => flatIds.push(c.id));
    else flatIds.push(r.id);
  });
  for (let i = 0; i < flatIds.length - 1; i += 1) {
    edges.push({
      id: `e:flow:${flatIds[i]}->${flatIds[i + 1]}`,
      source: `s:${flatIds[i]}`,
      target: `s:${flatIds[i + 1]}`,
      animated: false,
      type: 'straight',
      style: { stroke: 'var(--accent-soft)', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.6 },
    });
  }

  return { nodes, edges };
});

function onNodeClick(event: { node: { id: string; data: { kind: string } } }) {
  if (event.node.data.kind === 'story') {
    const id = event.node.id.replace(/^s:/, '');
    emit('pick', id);
  }
}

function fmt(n?: number) {
  if (n === undefined) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function handleResetView() {
  fitView({ duration: 500, padding: 0.15 });
}

const lastFitId = ref<string | null>(null);

watch(
  () => book.currentStoryId,
  async (id) => {
    if (!id || lastFitId.value === id) return;
    lastFitId.value = id;
    await nextTick();
    const nodeEl = document.querySelector(`[data-id="s:${id}"]`) as HTMLElement | null;
    if (nodeEl) {
      const x = Number(nodeEl.style.transform.match(/translate\(([-\d.]+)px/)?.[1] ?? 0) + 120;
      const y = Number(nodeEl.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px/)?.[2] ?? 0) + 45;
      setCenter(x, y, { zoom: 0.95, duration: 600 });
    } else {
      fitView({ duration: 400, padding: 0.15 });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="story-map">
    <VueFlow
      :nodes="layout.nodes"
      :edges="layout.edges"
      :default-viewport="{ x: 40, y: 40, zoom: 0.85 }"
      :min-zoom="0.2"
      :max-zoom="2"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :fit-view-on-init="true"
      @node-click="onNodeClick"
    >
      <template #node-default="{ data, label }">
        <div
          class="sn"
          :class="{
            'sn--group': data.kind === 'group',
            'sn--story': data.kind === 'story',
            'is-visited': data.visited,
            'is-current': data.isCurrent,
          }"
        >
          <div class="sn__dot" />
          <div v-if="data.kind === 'story'" class="sn__order">
            {{ String(data.order ?? 0).padStart(2, '0') }}
          </div>
          <div class="sn__label">{{ label }}</div>
          <div v-if="data.kind === 'story'" class="sn__meta">
            <span class="sn__words">{{ fmt(data.words) }} 字</span>
            <span class="sn__sep">·</span>
            <span class="sn__mins">~{{ data.minutes ?? 1 }} min</span>
          </div>
        </div>
      </template>
    </VueFlow>

    <!-- Map controls toolbar -->
    <div class="map-controls">
      <button class="map-ctrl-btn" title="放大" @click="zoomIn()">+</button>
      <button class="map-ctrl-btn" title="缩小" @click="zoomOut()">−</button>
      <button class="map-ctrl-btn map-ctrl-btn--reset" title="适应全图" @click="handleResetView">
        <span>⊙</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.story-map {
  position: relative;
  width: 100%;
  height: 100%;
}
.map-controls {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}
.map-ctrl-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--bg-paper);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  color: var(--ink-soft);
  font-size: 16px;
  font-weight: 500;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.map-ctrl-btn:hover {
  background: var(--bg-secondary);
  color: var(--accent);
}
.map-ctrl-btn--reset {
  font-size: 18px;
}
:deep(.vue-flow) {
  background: transparent;
}
:deep(.vue-flow__node) {
  background: transparent;
  border: none;
  padding: 0;
  width: auto;
}
:deep(.vue-flow__node.selected) .sn {
  border-color: var(--accent);
  box-shadow: var(--shadow-deep);
}
.sn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 18px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-paper);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  min-width: 156px;
  max-width: 200px;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.sn:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}
.sn__dot {
  position: absolute;
  top: -6px;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transform: translateX(-50%);
}
.sn--group .sn__dot {
  background: var(--accent);
}
.sn--group .sn__label {
  font-family: var(--font-serif-en);
  font-size: 13px;
  letter-spacing: 0.22em;
  color: var(--muted);
  text-transform: uppercase;
}
.sn--story.is-current {
  border-color: var(--accent);
  background: var(--accent-bg);
}
.sn--story.is-current .sn__dot {
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.sn--story.is-visited:not(.is-current) .sn__dot {
  background: var(--muted);
}
.sn__order {
  font-family: var(--font-serif-en);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--muted);
}
.sn__label {
  font-family: var(--font-serif-cjk);
  font-size: 14px;
  color: var(--ink);
  text-align: center;
  line-height: 1.4;
  word-break: break-word;
}
.sn__meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
}
.sn__sep {
  opacity: 0.5;
}
</style>
