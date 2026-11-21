<script setup lang="ts">
import { useId } from "vue";
import type { TagNode } from "../lib/tags";
defineProps<{ nodes: TagNode[]; selected: string[] }>();
const treeId = useId();
const emit = defineEmits<{ toggle: [path: string] }>();
</script>

<template>
  <ul class="tag-tree">
    <li
      v-for="(node, index) in nodes"
      :key="node.path"
      :class="{ branch: node.children.length }"
    >
      <div class="tag-row">
        <button
          class="chip"
          :class="{ picked: selected.includes(node.path) }"
          :aria-pressed="selected.includes(node.path)"
          :aria-expanded="
            node.children.length ? selected.includes(node.path) : undefined
          "
          :aria-controls="
            node.children.length ? `${treeId}-${index}` : undefined
          "
          :title="node.path.split('/').join(' › ')"
          @click="emit('toggle', node.path)"
        >
          {{ selected.includes(node.path) ? "✓ " : "+ " }}{{ node.label }}
          <span
            v-if="node.children.length"
            class="subtag-chevron icon-[lucide--chevron-right]"
            :class="{ expanded: selected.includes(node.path) }"
            aria-hidden="true"
          ></span>
        </button>
      </div>
      <Transition name="subtags">
        <div
          v-if="node.children.length && selected.includes(node.path)"
          :id="`${treeId}-${index}`"
          class="subtag-children"
        >
          <TagTree
            :nodes="node.children"
            :selected="selected"
            @toggle="emit('toggle', $event)"
          />
        </div>
      </Transition>
    </li>
  </ul>
</template>

<style scoped>
.tag-tree {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  padding: 0;
  margin: 14px 0 0;
}
.branch {
  min-width: 0;
  max-width: 100%;
}
.branch:has(> .subtag-children) {
  flex-basis: 100%;
}
.branch > .tag-row > .chip {
  font-weight: 500;
}
.subtag-children {
  border-left: 1px solid var(--line);
  padding-left: 16px;
  margin: 10px 0 4px 8px;
}
.chip {
  border: 1px solid transparent;
  text-align: left;
}
.chip.picked {
  color: var(--on-accent);
  background: var(--accent);
}
.chip:hover {
  border-color: var(--accent);
}
.tag-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.subtag-chevron {
  display: inline-block;
  vertical-align: middle;
  margin-left: 5px;
  transition: transform 0.18s;
}
.subtag-chevron.expanded {
  transform: rotate(90deg);
}
.subtags-enter-active,
.subtags-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.subtags-enter-from,
.subtags-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
