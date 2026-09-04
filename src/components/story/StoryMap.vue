<script setup lang="ts">
import { computed } from 'vue';
import { VueFlow, Position, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { useStoryStore } from '@/stores/story';
import { useBookStore } from '@/stores/book';
import { isStoryGroup } from '@/core/story/types';
import type { StoryDocument } from '@/core/story/types';

const emit = defineEmits<{
  (e: 'pick', id: string): void;
}>();

const story = useStoryStore();
const book = useBookStore();

interface PositionedNode extends Node {
  id: string;
  label: string;
  position: { x: number; y: number };
  data: { kind: 'root' | 'group' | 'story'; visited: boolean; isCurrent: boolean };
}

const layout = computed<{ nodes: PositionedNode[]; edges: Edge[] }>(() => {
  const idx = story.index;
  if (!idx) return { nodes: [], edges: [] };
  const roots = idx.roots;
  const visited = new Set(story.visited);
  const currentId = book.currentStoryId;

  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];

  // Spread horizontally: each root/group is a column.
  const columnWidth = 260;
  const rowHeight = 120;
  const startX = 0;
  const startY = 0;

  roots.forEach((root, ci) => {
    if (isStoryGroup(root)) {
      // group node
      const groupX = startX + ci * columnWidth;
      const groupY = startY;
      nodes.push({
        id: `g:${root.id}`,
        type: 'default',
        label: root.title,
        position: { x: groupX, y: groupY },
        data: { kind: 'group', visited: false, isCurrent: false },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      root.children.forEach((child, ri) => {
        const x = groupX - ((root.children.length - 1) * columnWidth) / 2 + ri * columnWidth;
        const y = groupY + rowHeight * 1.4;
        const isCurrent = child.id === currentId;
        nodes.push({
          id: `s:${child.id}`,
          type: 'default',
          label: child.title,
          position: { x, y },
          data: {
            kind: 'story',
            visited: visited.has(child.id),
            isCurrent,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
        edges.push({
          id: `e:g:${root.id}->s:${child.id}`,
          source: `g:${root.id}`,
          target: `s:${child.id}`,
          animated: false,
          type: 'straight',
        });
      });
    } else {
      const x = startX + ci * columnWidth;
      const y = startY + rowHeight * 0.4;
      const isCurrent = root.id === currentId;
      nodes.push({
        id: `s:${root.id}`,
        type: 'default',
        label: root.title,
        position: { x, y },
        data: { kind: 'story', visited: visited.has(root.id), isCurrent },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    }
  });

  return { nodes, edges };
});

function onNodeClick(event: { node: { id: string; data: { kind: string } } }) {
  if (event.node.data.kind === 'story') {
    const id = event.node.id.replace(/^s:/, '');
    emit('pick', id);
  }
}
</script>

<template>
  <div class="story-map">
    <VueFlow
      :nodes="layout.nodes"
      :edges="layout.edges"
      :default-viewport="{ x: 40, y: 80, zoom: 0.85 }"
      :min-zoom="0.4"
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
            'sn--root': data.kind === 'root',
            'sn--group': data.kind === 'group',
            'sn--story': data.kind === 'story',
            'is-visited': data.visited,
            'is-current': data.isCurrent,
          }"
        >
          <div class="sn__dot" />
          <div class="sn__label">{{ label }}</div>
          <div class="sn__sub" v-if="data.kind === 'story'">
            {{ data.visited ? 'read' : data.isCurrent ? 'reading' : 'unread' }}
          </div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.story-map {
  width: 100%;
  height: 100%;
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
.sn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-paper);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  min-width: 140px;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.sn:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}
.sn__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  margin-bottom: 4px;
}
.sn--group .sn__dot {
  background: var(--accent);
}
.sn--group .sn__label {
  font-family: var(--font-serif-en);
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--muted);
}
.sn--story .sn__label {
  font-family: var(--font-serif-cn);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ink);
}
.is-current {
  border-color: var(--accent);
  box-shadow: var(--shadow-deep);
}
.is-current .sn__dot {
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(139, 107, 61, 0.2);
}
.is-visited .sn__dot {
  background: var(--ink-soft);
}
.sn__sub {
  font-family: var(--font-serif-en);
  font-style: italic;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.18em;
}
:deep(.vue-flow__edge-path) {
  stroke: var(--accent-soft);
  stroke-width: 1;
}
</style>
