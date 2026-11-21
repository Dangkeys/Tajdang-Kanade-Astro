<script setup lang="ts">
defineProps<{ image?: string; kind?: string; fit?: "cover" | "contain" }>();
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
  <div
    class="post-cover"
    :class="{
      'logo-cover': image?.split(/[?#]/)[0]?.endsWith('.svg'),
      'contained-cover': fit === 'contain',
    }"
    aria-hidden="true"
  >
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
.logo-cover {
  background: #fff;
}
.logo-cover img {
  object-fit: contain;
  padding: 16px;
}
.contained-cover {
  background: #fff;
}
.contained-cover img {
  object-fit: contain;
}
</style>
