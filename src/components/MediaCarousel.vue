<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import type { PostMedia } from "../lib/media";
import type { Language } from "../i18n";
const props = defineProps<{ items: PostMedia[]; lang: Language }>();
const track = ref<HTMLElement>();
const ready = ref(false);
const slides = computed(() => {
  const entries = props.items.map((item, original) => ({
    item,
    original,
    clone: false,
  }));
  if (entries.length < 2) return entries;
  const copies = entries.map((entry) => ({ ...entry, clone: true }));
  return [...copies, ...entries, ...copies];
});
const cycleStart = computed(() =>
  props.items.length > 1 ? props.items.length : 0,
);
const physicalIndex = ref(cycleStart.value);
const index = computed(() => slides.value[physicalIndex.value]?.original ?? 0);
const dragging = ref(false);
const th = props.lang === "th";
const hovered = ref(false);
let pointerActive = false;
let suppressClick = false;
let lastInteraction = 0;
let autoTimer: ReturnType<typeof setInterval> | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let resizeObserver: ResizeObserver | undefined;
let drag: { id: number; x: number; scroll: number } | undefined;

function nearestSlide() {
  const element = track.value;
  if (!element) return physicalIndex.value;
  const center = element.scrollLeft + element.clientWidth / 2;
  let closest = physicalIndex.value;
  let distance = Infinity;
  Array.from(element.children).forEach((slide, position) => {
    if (!(slide instanceof HTMLElement)) return;
    const delta = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
    if (delta < distance) {
      distance = delta;
      closest = position;
    }
  });
  return closest;
}
function goToPhysical(position: number, instant = false) {
  const element = track.value;
  const slide = element?.children[position];
  if (!element || !(slide instanceof HTMLElement)) return;
  element.scrollTo({
    left: slide.offsetLeft - (element.clientWidth - slide.clientWidth) / 2,
    behavior:
      instant || matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
  });
  if (instant) physicalIndex.value = position;
}
function normalizeLoop() {
  if (props.items.length < 2) return;
  const position = nearestSlide();
  if (position < props.items.length || position >= props.items.length * 2)
    goToPhysical(props.items.length + (position % props.items.length), true);
}
function settle() {
  if (pointerActive || dragging.value || !ready.value) return;
  physicalIndex.value = nearestSlide();
  normalizeLoop();
}
function scheduleSettle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, 180);
}
function updateIndex() {
  physicalIndex.value = nearestSlide();
  scheduleSettle();
}
function step(direction: number) {
  if (props.items.length < 2) return;
  normalizeLoop();
  goToPhysical(physicalIndex.value + direction);
}
function clickImage(event: MouseEvent, position: number) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (
    slides.value[position]?.item.type !== "image" ||
    !(event.currentTarget instanceof HTMLElement)
  )
    return;
  lastInteraction = Date.now();
  const bounds = event.currentTarget.getBoundingClientRect();
  const direction = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
  const target = slides.value[position];
  if (!target || props.items.length < 2) return;
  const realPosition = target.original + cycleStart.value;
  if (target.clone) goToPhysical(realPosition, true);
  goToPhysical(realPosition + direction);
}
function startDrag(event: PointerEvent) {
  pointerActive = true;
  lastInteraction = Date.now();
  suppressClick = false;
  if (event.pointerType !== "mouse" || event.button !== 0 || !track.value)
    return;
  if (
    event.target instanceof Element &&
    event.target.closest("video, iframe, button, a")
  )
    return;
  normalizeLoop();
  drag = {
    id: event.pointerId,
    x: event.clientX,
    scroll: track.value.scrollLeft,
  };
}
function moveDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId || !track.value) return;
  const delta = event.clientX - drag.x;
  if (!dragging.value && Math.abs(delta) > 5) {
    dragging.value = true;
    suppressClick = true;
    track.value.setPointerCapture(event.pointerId);
  }
  if (dragging.value) {
    event.preventDefault();
    track.value.scrollLeft = drag.scroll - delta;
  }
}
function endDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  const didDrag = dragging.value;
  drag = undefined;
  dragging.value = false;
  if (track.value?.hasPointerCapture(event.pointerId))
    track.value.releasePointerCapture(event.pointerId);
  if (didDrag) requestAnimationFrame(() => goToPhysical(nearestSlide()));
}
function endInteraction(event: PointerEvent) {
  pointerActive = false;
  lastInteraction = Date.now();
  endDrag(event);
  scheduleSettle();
}
watch(physicalIndex, () => {
  Array.from(track.value?.children ?? []).forEach((slide, position) => {
    if (position !== physicalIndex.value)
      slide.querySelectorAll("video").forEach((video) => video.pause());
  });
});
onMounted(async () => {
  ready.value = true;
  await nextTick();
  goToPhysical(cycleStart.value + index.value, true);
  if (track.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!pointerActive && !dragging.value)
        goToPhysical(cycleStart.value + index.value, true);
    });
    resizeObserver.observe(track.value);
  }
  if (props.items.length < 2) return;
  autoTimer = setInterval(() => {
    if (
      document.hidden ||
      hovered.value ||
      pointerActive ||
      dragging.value ||
      track.value?.contains(document.activeElement) ||
      Date.now() - lastInteraction < 5000 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    if (props.items[index.value]?.type === "image") step(1);
  }, 5000);
});
onUnmounted(() => {
  clearInterval(autoTimer);
  clearTimeout(settleTimer);
  resizeObserver?.disconnect();
});
</script>
<template>
  <section
    v-if="items.length"
    class="media-carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="th ? 'รูปภาพและวิดีโอของบทความ' : 'Article images and videos'"
    @pointerenter="hovered = $event.pointerType === 'mouse'"
    @pointerleave="hovered = false"
  >
    <div
      ref="track"
      class="media-track"
      :class="{ dragging, ready, single: items.length === 1 }"
      tabindex="0"
      :aria-label="
        th
          ? 'ปัดซ้ายหรือขวาเพื่อดูสื่อ ใช้ปุ่มลูกศรบนคีย์บอร์ดได้'
          : 'Swipe or drag to browse. Arrow keys also work.'
      "
      @scroll.passive="updateIndex"
      @scrollend="settle"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endInteraction"
      @pointercancel="endInteraction"
      @lostpointercapture="endDrag"
      @pointerleave="!dragging && endInteraction($event)"
      @keydown.left.self.prevent="step(-1)"
      @keydown.right.self.prevent="step(1)"
      @dragstart.prevent
    >
      <figure
        v-for="(slide, position) in slides"
        :key="position"
        class="media-slide"
        :class="{
          current: physicalIndex === position,
          'loop-clone': slide.clone,
        }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${slide.original + 1} / ${items.length}`"
      >
        <div
          class="media-surface"
          :class="{
            'image-surface': slide.item.type === 'image' && items.length > 1,
          }"
          @click="clickImage($event, position)"
        >
          <img
            v-if="slide.item.type === 'image'"
            :src="slide.item.src"
            :alt="slide.item.alt"
            loading="lazy"
            draggable="false"
          />
          <video
            v-else-if="slide.item.type === 'video'"
            :src="slide.item.src"
            :poster="slide.item.poster"
            :aria-label="slide.item.title"
            controls
            playsinline
            preload="metadata"
          ></video>
          <iframe
            v-else-if="physicalIndex === position"
            :src="
              slide.item.type === 'youtube' ? slide.item.url : slide.item.src
            "
            :title="slide.item.title"
            loading="lazy"
            allow="
              fullscreen;
              picture-in-picture;
              encrypted-media;
              accelerometer;
              gyroscope;
            "
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <div v-else class="embed-preview">
            <span class="icon-[lucide--play]" aria-hidden="true"></span
            >{{ slide.item.title }}
          </div>
        </div>
        <figcaption v-if="slide.item.caption">
          {{ slide.item.caption }}
        </figcaption>
      </figure>
    </div>
    <div v-if="items.length > 1" class="media-progress">
      <div class="media-dots" aria-hidden="true">
        <span
          v-for="(_, position) in items"
          :key="position"
          :class="{ active: index === position }"
        ></span>
      </div>
    </div>
  </section>
</template>
<style scoped>
.media-carousel {
  width: 100%;
  max-width: 720px;
  margin: 28px auto 36px;
  min-width: 0;
}
.media-track {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  padding: 10px 8%;
  scroll-padding-inline: 8%;
  scrollbar-width: none;
  cursor: grab;
}
.image-surface {
  cursor: pointer;
}
.dragging .image-surface {
  cursor: grabbing;
}
.media-track::-webkit-scrollbar {
  display: none;
}
.media-track.dragging {
  cursor: grabbing;
  user-select: none;
  scroll-snap-type: none;
}
.media-track:not(.ready) .loop-clone {
  display: none;
}
.media-track.single {
  padding-inline: 0;
  cursor: default;
}
.media-slide {
  flex: 0 0 100%;
  min-width: 0;
  margin: 0;
  scroll-snap-align: center;
  opacity: 0.55;
  transition: opacity 0.3s ease;
}
.media-slide.current {
  opacity: 1;
}
.media-surface {
  width: 100%;
  height: clamp(220px, 45vw, 400px);
  max-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.media-surface > img,
.media-surface > video {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 0;
  border-radius: 10px;
}
.media-surface > iframe,
.embed-preview {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 10px;
}
.embed-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}
.embed-preview span {
  font-size: 36px;
}
.media-slide figcaption {
  min-height: 44px;
  margin: 0;
  padding: 12px 0 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.media-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 12px;
  color: var(--muted);
  font-size: 12px;
}
.media-dots {
  display: flex;
  gap: 6px;
}
.media-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  opacity: 0.35;
  transition:
    width 0.25s ease,
    opacity 0.25s ease;
}
.media-dots .active {
  width: 18px;
  border-radius: 5px;
  background: var(--accent);
  opacity: 1;
}
@media (max-width: 600px) {
  .media-track {
    gap: 10px;
    padding-inline: 6%;
    scroll-padding-inline: 6%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .media-slide,
  .media-dots span {
    transition: none;
  }
}
</style>
