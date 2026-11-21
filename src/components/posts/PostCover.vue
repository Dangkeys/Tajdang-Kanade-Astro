<script setup lang="ts">
defineProps<{ image?: string; kind?: string }>();
const icons: Record<string, string> = {
  astro: "icon-[simple-icons--astro]",
  vue: "icon-[simple-icons--vuedotjs]",
  css: "icon-[lucide--palette]",
  notes: "icon-[lucide--coffee]",
  life: "icon-[lucide--sprout]",
  typescript: "icon-[simple-icons--typescript]",
  git: "icon-[lucide--git-branch]",
  design: "icon-[lucide--sparkles]",
};
</script>

<template>
  <div class="post-cover" aria-hidden="true">
    <img v-if="image" :src="image" alt="" loading="lazy" decoding="async" />
    <span
      v-else
      class="cover-icon"
      :class="icons[kind ?? 'notes'] ?? icons.notes"
    ></span>
  </div>
</template>

<style scoped>
.post-cover {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 160px;
  overflow: hidden;
  background: var(--plum-soft);
  display: grid;
  place-items: center;
}
.cover-icon {
  color: var(--plum);
  font-size: 44px;
}
.post-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
