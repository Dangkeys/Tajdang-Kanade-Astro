<script setup lang="ts">
import { ref, useId } from "vue";
import type { Language } from "../i18n";
import type { TagNode } from "../lib/tags";
const props = defineProps<{
  nodes: TagNode[];
  selected: string[];
  lang?: Language;
}>();
const expanded = ref<string[]>([]);
const treeId = useId();
function toggleBranch(path: string) {
  expanded.value = expanded.value.includes(path)
    ? expanded.value.filter((value) => value !== path)
    : [...expanded.value, path];
}
function expandLabel(path: string) {
  const open = expanded.value.includes(path);
  return props.lang === "th"
    ? `${open ? "ซ่อน" : "แสดง"}แท็กย่อยของ ${path.split("/").join(" › ")}`
    : `${open ? "Hide" : "Show"} subtags under ${path.split("/").join(" › ")}`;
}
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
          :title="node.path.split('/').join(' › ')"
          @click="emit('toggle', node.path)"
        >
          {{ selected.includes(node.path) ? "✓ " : "+ " }}{{ node.label }}
        </button>
        <button
          v-if="node.children.length"
          class="subtag-toggle"
          :aria-expanded="expanded.includes(node.path)"
          :aria-controls="`${treeId}-${index}`"
          :aria-label="expandLabel(node.path)"
          :title="expandLabel(node.path)"
          @click="toggleBranch(node.path)"
        >
          <span class="child-count">{{ node.children.length }}</span
          ><span
            class="subtag-chevron icon-[lucide--chevron-right]"
            :class="{ expanded: expanded.includes(node.path) }"
            aria-hidden="true"
          ></span>
        </button>
      </div>
      <Transition name="subtags">
        <div
          v-if="node.children.length && expanded.includes(node.path)"
          :id="`${treeId}-${index}`"
          class="subtag-children"
        >
          <TagTree
            :nodes="node.children"
            :selected="selected"
            :lang="lang"
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
  gap: 10px;
  padding: 0;
  margin: 14px 0 0;
}
.branch {
  flex-basis: 100%;
}
.branch > .tag-row > .chip {
  font-weight: 600;
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
.subtag-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 4px 7px;
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.subtag-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.subtag-chevron {
  transition: transform 0.18s;
}
.subtag-toggle .expanded {
  transform: rotate(90deg);
}
.child-count {
  font-size: 12px;
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
