<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { translator, homePath, type Language } from "../i18n";
import type { PostSummary } from "../lib/posts";
import { personalInfo } from "../config";
import PostCover from "./posts/PostCover.vue";
import TagTree from "./TagTree.vue";
import { buildTagTree, matchesTag, tagBreadcrumb, tagLabel } from "../lib/tags";
const props = defineProps<{ posts: PostSummary[]; lang: Language }>();
const t = translator(props.lang);
const home = homePath(props.lang);
const th = props.lang === "th";
const query = ref("");
const category = ref("");
const selectedTags = ref<string[]>([]);
const tagMatch = ref<"any" | "all">("any");
const quoteIndex = ref(0);
const quotes = [
  {
    en: "Keep learning. Keep building. One small step at a time.",
    th: "ค่อย ๆ เรียนรู้ แล้วลงมือทำทีละอย่าง",
  },
  {
    en: "Understand the problem before reaching for a tool.",
    th: "เข้าใจปัญหาให้ชัด ก่อนเลือกเครื่องมือ",
  },
  {
    en: "A small thing that works is a good place to start.",
    th: "เริ่มจากสิ่งเล็ก ๆ ที่ใช้งานได้จริง",
  },
  {
    en: "Stay curious about the things you use every day.",
    th: "อย่าหยุดสงสัยในสิ่งที่ใช้ทุกวัน",
  },
];
const currentQuote = computed(() => {
  const quote = quotes[quoteIndex.value % quotes.length];
  return th ? quote?.th : quote?.en;
});
function nextQuote() {
  quoteIndex.value = (quoteIndex.value + 1) % quotes.length;
}
const groups = [
  "personal",
  "projects",
  "work-experience",
  "activities",
] as const;
const labels = {
  personal: t("category.personal"),
  projects: t("category.projects"),
  "work-experience": t("category.work-experience"),
  activities: t("category.activities"),
};
const categoryPosts = computed(() =>
  props.posts.filter(
    (post) => !category.value || post.category === category.value,
  ),
);
const tagTree = computed(() =>
  buildTagTree(categoryPosts.value.flatMap((post) => post.tags)),
);
const filtered = computed(() =>
  categoryPosts.value.filter(
    (post) =>
      (!selectedTags.value.length ||
        (tagMatch.value === "all"
          ? selectedTags.value.every((tag) => matchesTag(post.tags, tag))
          : selectedTags.value.some((tag) => matchesTag(post.tags, tag)))) &&
      `${post.title} ${post.description} ${post.tags.join(" ")}`
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
);
function categoryTitle(value: string) {
  const group = groups.find((group) => group === value);
  return group ? labels[group] : value;
}

function sync() {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries({
    q: query.value,
    category: category.value,
    match: tagMatch.value === "all" ? "all" : "",
  }))
    value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  url.searchParams.delete("tag");
  selectedTags.value.forEach((tag) => url.searchParams.append("tag", tag));
  window.history.replaceState(null, "", url);
}
function choose(value: string) {
  category.value = value;
  selectedTags.value = [];
  sync();
}
function chooseTag(value: string) {
  selectedTags.value = selectedTags.value.includes(value)
    ? selectedTags.value.filter((tag) => tag !== value)
    : [...selectedTags.value, value];
  sync();
}
function reset() {
  tagMatch.value = "any";
  query.value = "";
  category.value = "";
  selectedTags.value = [];
  sync();
}
function readUrl() {
  const params = new URLSearchParams(location.search);
  query.value = params.get("q") || "";
  tagMatch.value = params.get("match") === "all" ? "all" : "any";
  const requestedCategory = params.get("category") || "";
  category.value =
    requestedCategory === "skills" ? "personal" : requestedCategory;
  selectedTags.value = [...new Set(params.getAll("tag"))];
}
onMounted(() => readUrl());
</script>
<template>
  <div class="shell portfolio-grid">
    <aside class="portfolio-profile">
      <section class="card profile">
        <span class="eyebrow">{{ t("author.eyebrow") }}</span>
        <a
          class="avatar-link"
          :href="`${home}posts/about-me/`"
          :aria-label="th ? 'รู้จัก Tajdang' : 'About Tajdang'"
          ><img :src="personalInfo.avatar" alt="Tajdang" width="88" height="88"
        /></a>
        <h2>Tajdang<span class="accent">.</span></h2>
        <p class="role">{{ t("author.role") }}</p>
        <p class="muted">{{ t("author.bio") }}</p>
        <a :href="`${home}posts/about-me/`" class="text-link">{{
          th ? "รู้จักผมมากขึ้น" : "A little more about me"
        }}</a>
        <div class="contacts">
          <a
            v-for="link in personalInfo.socialLinks"
            :key="link.url"
            :href="link.url"
            :aria-label="link.name"
            :title="link.name"
            :target="link.url.startsWith('https:') ? '_blank' : undefined"
            rel="noopener noreferrer"
            ><span :class="link.icon" aria-hidden="true"></span
          ></a>
        </div>
      </section>
    </aside>
    <section class="portfolio-work" aria-labelledby="work-title">
      <div class="portfolio-intro">
        <span class="eyebrow">{{
          th ? "ผลงานและบันทึกการเรียนรู้" : "WORK & FIELD NOTES"
        }}</span>
        <h2 id="work-title">
          {{
            th
              ? "สิ่งที่ผมทำ และสิ่งที่ได้เรียนรู้"
              : "What I build. What I learn."
          }}
        </h2>
        <p class="muted">
          {{
            th
              ? "โปรเจกต์ ประสบการณ์ และเรื่องที่กำลังเรียนรู้ รวมไว้ในที่เดียว"
              : "Projects, experience, and things I’m figuring out, all in one place."
          }}
        </p>
      </div>
      <label class="portfolio-search card"
        ><span class="icon-[lucide--search]" aria-hidden="true"></span
        ><input
          v-model="query"
          @input="sync"
          type="search"
          :aria-label="th ? 'ค้นหาผลงาน' : 'Search my work'"
          :placeholder="
            th
              ? 'ค้นหาโปรเจกต์ ทักษะ หรือเรื่องที่สนใจ…'
              : 'Search projects, skills, or a topic…'
          "
      /></label>
      <div
        class="portfolio-filters"
        :aria-label="th ? 'หมวดหมู่' : 'Categories'"
      >
        <button
          :class="{ selected: !category }"
          :aria-pressed="!category"
          @click="choose('')"
        >
          {{ th ? "ทั้งหมด" : "Everything" }}</button
        ><button
          v-for="group in groups"
          :key="group"
          :class="{ selected: category === group }"
          :aria-pressed="category === group"
          @click="choose(group)"
        >
          {{ labels[group] }}
        </button>
      </div>
      <details
        :key="category"
        class="card category-skills"
        :aria-label="th ? 'กรองตามทักษะ' : 'Filter by skills'"
      >
        <summary class="skill-heading">
          <span>{{ th ? "กรองตามแท็ก" : "Filter by tags" }}</span
          ><span class="muted">{{
            selectedTags.length
              ? `${selectedTags.length} ${th ? "แท็กที่เลือก" : "selected"}`
              : th
                ? "เลือกได้หลายแท็ก"
                : "Select multiple"
          }}</span
          ><span
            class="filter-chevron icon-[lucide--chevron-down]"
            aria-hidden="true"
          ></span>
        </summary>
        <div class="skill-content">
          <fieldset v-if="tagTree.length" class="tag-match">
            <legend>{{ th ? "วิธีจับคู่แท็ก" : "Match selected tags" }}</legend>
            <label
              ><input
                v-model="tagMatch"
                @change="sync"
                type="radio"
                value="any"
                name="tag-match"
              />{{ th ? "ตรงอย่างน้อยหนึ่งแท็ก (OR)" : "Any tag (OR)" }}</label
            ><label
              ><input
                v-model="tagMatch"
                @change="sync"
                type="radio"
                value="all"
                name="tag-match"
              />{{ th ? "ตรงทุกแท็ก (AND)" : "All tags (AND)" }}</label
            >
          </fieldset>
          <p v-else class="muted no-category-tags">
            {{
              th
                ? "แท็กจะแสดงเมื่อมีโพสต์ในหมวดหมู่นี้"
                : "Tags will appear when posts are added to this category."
            }}
          </p>
          <TagTree
            :nodes="tagTree"
            :selected="selectedTags"
            @toggle="chooseTag"
          />
        </div>
      </details>
      <div v-if="selectedTags.length" class="active-tag">
        <span class="muted"
          >{{ th ? "แท็กที่เลือก" : "Selected" }} ({{
            tagMatch === "all" ? "AND" : "OR"
          }}):</span
        ><button
          v-for="item in selectedTags"
          :key="item"
          class="chip picked"
          @click="chooseTag(item)"
          :aria-label="`${th ? 'ลบแท็ก' : 'Remove tag'} ${item}`"
        >
          {{ tagBreadcrumb(item) }} ×</button
        ><button
          class="text-link"
          @click="
            selectedTags = [];
            sync();
          "
        >
          {{ th ? "ล้างแท็ก" : "Clear tags" }}
        </button>
      </div>
      <TransitionGroup
        name="post"
        tag="div"
        class="portfolio-posts"
        aria-live="polite"
      >
        <article
          v-for="post in filtered"
          :key="post.id"
          class="card portfolio-post"
        >
          <a
            :href="`${home}posts/${post.id}/`"
            class="post-tile"
            :class="post.category"
            ><PostCover :kind="post.cover" :lang="lang"
          /></a>
          <div class="post-copy">
            <div class="post-kicker">
              <span v-if="post.featured" class="starred-post"
                ><span class="icon-[lucide--star]" aria-hidden="true"></span
                >{{ th ? "ปักหมุด" : "Pinned" }}</span
              ><span class="eyebrow">{{ categoryTitle(post.category) }}</span>
            </div>
            <h3>
              <a :href="`${home}posts/${post.id}/`">{{ post.title }}</a>
            </h3>
            <p class="muted">{{ post.description }}</p>
            <div class="topic-tags">
              <button
                v-for="item in post.tags"
                :key="item"
                class="chip"
                :title="tagBreadcrumb(item)"
                :class="{ picked: selectedTags.includes(item) }"
                :aria-pressed="selectedTags.includes(item)"
                @click="chooseTag(item)"
              >
                {{ tagLabel(item) }}
              </button>
            </div>
          </div>
        </article>
        <div v-if="!filtered.length" key="empty" class="card empty-state">
          <span class="icon-[lucide--sprout]" aria-hidden="true"></span>
          <h3>
            {{ th ? "ยังไม่มีโพสต์ในหัวข้อนี้" : "Nothing here just yet" }}
          </h3>
          <p>
            {{
              th
                ? "กำลังค่อย ๆ รวบรวมผลงาน ลองดูหัวข้ออื่นได้ครับ"
                : "I’m still collecting my work. Try another topic or check back soon."
            }}
          </p>
          <button class="btn secondary" @click="reset">
            {{ th ? "ดูทั้งหมด" : "Show everything" }}
          </button>
        </div>
      </TransitionGroup>
    </section>
    <aside class="portfolio-right">
      <figure class="card portrait-card">
        <a
          class="portrait-link"
          :href="`${home}posts/about-me/`"
          :aria-label="th ? 'รู้จัก Tajdang' : 'About Tajdang'"
        >
          <img
            src="/images/taj-portrait.png"
            :alt="th ? 'ภาพถ่ายของ Tajdang' : 'Portrait of Tajdang'"
            width="1108"
            height="1477"
            loading="lazy"
        /></a>
        <figcaption>
          <span class="eyebrow">{{
            th ? "อีกมุมหนึ่งของผม" : "A LITTLE MORE ME"
          }}</span>
          <p>
            {{
              th
                ? "นอกจอก็ยังเป็นคนชอบลองสิ่งใหม่ ๆ"
                : "A face behind the code."
            }}
          </p>
        </figcaption>
      </figure>
      <div class="quote-shell">
        <section class="card quote-card">
          <span
            :key="`mark-${quoteIndex}`"
            class="quote-mark"
            aria-hidden="true"
            >“</span
          >
          <span
            :key="`spark-${quoteIndex}`"
            class="quote-sparks"
            aria-hidden="true"
            ><span>✧</span><span>✦</span></span
          >
          <span
            v-if="quoteIndex"
            :key="`ripple-${quoteIndex}`"
            class="quote-ripple"
            aria-hidden="true"
          ></span>
          <div class="quote-content" aria-live="polite" aria-atomic="true">
            <Transition name="quote" mode="out-in"
              ><blockquote :key="quoteIndex">
                {{ currentQuote }}
              </blockquote></Transition
            >
          </div>
          <span class="eyebrow">{{
            th ? "เตือนใจตัวเอง" : "A NOTE TO MYSELF"
          }}</span>
          <button
            class="quote-trigger"
            type="button"
            @click="nextQuote"
            :aria-label="th ? 'อ่านข้อคิดถัดไป' : 'Show another thought'"
          ></button>
        </section>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.portfolio-grid {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 220px;
  gap: 22px;
  padding-top: 24px;
  padding-bottom: 64px;
  max-width: 1390px;
}
.portfolio-profile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.profile {
  container: profile / inline-size;
  padding: 26px 24px;
  text-align: center;
}
.profile img {
  margin: 20px auto 12px;
  border-radius: 26px;
  object-fit: cover;
}
.profile h2 {
  font-size: 27px;
  margin: 0;
}
.profile p {
  font-size: 14px;
}
.profile .role {
  color: var(--accent);
  margin: 4px 0 16px;
}
.contacts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  justify-items: center;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding-top: 20px;
  margin-top: 20px;
}
.contacts a {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--accent);
  font-size: 14px;
}
.contacts span {
  font-size: 20px;
}
.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.topic-tags button {
  border: 0;
}
.topic-tags .picked {
  color: var(--on-accent);
  background: var(--accent);
}
.portfolio-intro h2 {
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.35;
  margin: 8px 0 12px;
}
.portfolio-intro p {
  margin: 0 0 24px;
  font-size: 15px;
}
.portfolio-search {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
  color: var(--accent);
}
.portfolio-search input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--text);
  font-size: 16px;
}
.portfolio-search:focus-within {
  outline: 2px solid var(--accent);
}
.portfolio-search input::placeholder {
  color: var(--muted);
}
.portfolio-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 24px;
}
.portfolio-filters button {
  padding: 8px 12px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--muted);
  border-radius: 9px;
  font-size: 14px;
}
.portfolio-filters button.selected {
  color: var(--on-accent);
  background: var(--accent);
  border-color: var(--accent);
}
.portfolio-posts {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.portfolio-post {
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  padding: 10px;
  gap: 20px;
}
.portfolio-post:hover {
  border-color: var(--accent);
}
.post-tile {
  overflow: hidden;
  border-radius: 11px;
  background: var(--plum-soft);
  color: var(--plum);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 195px;
  font-size: 13px;
}
.post-tile.projects {
  background: var(--gold-soft);
  color: var(--gold);
}
.post-tile span:first-child {
  font-size: 48px;
}
.post-copy {
  padding: 15px 14px 15px 0;
}
.post-copy h3 {
  font-size: 21px;
  line-height: 1.4;
  margin: 8px 0;
}
.post-copy p {
  font-size: 14px;
}
.post-copy h3 a:hover {
  color: var(--accent);
}
.active-tag {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}
.active-tag button {
  background: none;
  border: 0;
}
@media (max-width: 760px) {
  .portfolio-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .profile {
    text-align: left;
    display: grid;
    grid-template-columns: 72px 1fr;
    column-gap: 18px;
  }
  .profile img {
    grid-column: 1;
    grid-row: 1/5;
    width: 72px;
    height: 72px;
    margin: 0;
    border-radius: 20px;
  }
  .profile > .eyebrow,
  .profile > h2,
  .profile > .role {
    grid-column: 2;
  }
  .profile > .muted,
  .profile > .text-link,
  .contacts {
    grid-column: 1/-1;
  }
  .portfolio-grid {
    display: flex;
    flex-direction: column;
  }
  .portfolio-profile {
    display: contents;
  }
  .profile {
    order: 0;
  }
  .portfolio-work {
    order: 1;
  }
  .portfolio-right {
    order: 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
  .portfolio-post {
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 14px;
  }
  .post-tile {
    min-height: 180px;
    font-size: 11px;
  }
  .post-tile span:first-child {
    font-size: 32px;
  }
  .post-copy h3 {
    font-size: 18px;
  }
  .post-copy {
    padding-right: 4px;
  }
}
</style>

<style scoped>
.portfolio-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.portrait-card {
  margin: 0;
  overflow: hidden;
}
.portrait-card img {
  width: 100%;
  height: auto;
  aspect-ratio: 3/4;
  object-fit: cover;
}
.portrait-card figcaption {
  padding: 18px;
}
.portrait-card p {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--muted);
}
.quote-card {
  padding: 24px;
  background: linear-gradient(135deg, var(--accent-soft), var(--card));
}
.quote-mark {
  color: var(--accent);
  font-size: 60px;
  line-height: 1;
}
.quote-card blockquote {
  margin: 0 0 20px;
  font-size: 19px;
  line-height: 1.8;
  color: var(--accent);
}
.category-skills {
  padding: 18px;
  margin-bottom: 18px;
}
.skill-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  margin-bottom: 14px;
}
.skill-heading h3 {
  margin: 0;
  font-size: 14px;
}
.skill-heading > span {
  font-size: 12px;
}
.active-tag {
  flex-wrap: wrap;
  align-items: center;
}
.active-tag .chip {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--line);
}
.portfolio-post {
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}
.portfolio-post:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}
.post-tile span:first-child {
  transition: transform 0.4s ease;
}
.portfolio-post:hover .post-tile span:first-child {
  transform: rotate(-8deg) scale(1.12);
}
.post-enter-active,
.post-leave-active,
.post-move {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.post-enter-from,
.post-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
.post-leave-active {
  position: absolute;
}
@media (min-width: 761px) and (max-width: 1150px) {
  .portfolio-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .portfolio-right {
    grid-column: 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
@media (max-width: 760px) {
  .portfolio-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .quote-card {
    padding: 18px;
  }
  .quote-card blockquote {
    font-size: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .portfolio-post:hover,
  .portfolio-post:hover .post-tile span:first-child {
    transform: none;
  }
  .post-enter-active,
  .post-leave-active,
  .post-move {
    transition: none;
  }
}
</style>

<style scoped>
.post-tile :deep(.post-cover) {
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}
.portfolio-post:hover .post-tile :deep(.post-cover) {
  transform: scale(1.04);
}
@media (prefers-reduced-motion: reduce) {
  .portfolio-post:hover .post-tile :deep(.post-cover) {
    transform: none;
  }
}
</style>

<style scoped>
@media (max-width: 760px) {
  .post-tile :deep(strong) {
    font-size: 16px;
    white-space: normal;
    text-align: center;
  }
}
</style>

<style scoped>
.category-skills {
  padding: 0;
}
.skill-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  margin: 0;
  cursor: pointer;
  list-style: none;
  font-size: 14px;
}
.skill-heading::-webkit-details-marker {
  display: none;
}
.skill-heading > span:first-child {
  color: var(--text);
  font-weight: 600;
}
.filter-chevron {
  margin-left: auto;
  color: var(--muted);
  transition: transform 0.2s;
}
.category-skills[open] .filter-chevron {
  transform: rotate(180deg);
}
.skill-content {
  padding: 0 18px 18px;
  border-top: 1px solid var(--line);
}
.tag-match {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin: 16px 0;
  padding: 0;
  border: 0;
  font-size: 13px;
}
.tag-match legend {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
}
.tag-match label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.tag-match input {
  accent-color: var(--accent);
}
.no-category-tags {
  font-size: 14px;
  margin: 16px 0 0;
}
</style>

<style scoped>
.post-kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.starred-post {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  background: var(--gold-soft);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 12px;
}
</style>

<style scoped>
.avatar-link {
  display: block;
  width: 88px;
  margin: 20px auto 12px;
  border-radius: 26px;
}
.avatar-link img {
  margin: 0;
  transition: transform 0.3s ease;
}
.avatar-link:hover img,
.avatar-link:focus-visible img {
  transform: rotate(-5deg) scale(1.05);
}
.portrait-link {
  display: block;
  overflow: hidden;
}
.portrait-link img {
  transition:
    transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1),
    filter 0.5s;
}
.portrait-link:hover img,
.portrait-link:focus-visible img {
  transform: scale(1.045) rotate(-1deg);
  filter: brightness(1.04);
}
.quote-card {
  position: relative;
  padding-bottom: 24px;
}
.quote-content {
  min-height: 150px;
}
.quote-trigger {
  position: absolute;
  inset: 0;
  width: 100%;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: var(--muted);
  text-align: left;
}
.quote-enter-active,
.quote-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.quote-enter-from {
  opacity: 0;
  transform: translateY(7px);
}
.quote-leave-to {
  opacity: 0;
  transform: translateY(-7px);
}
@media (max-width: 760px) {
  .profile > .avatar-link {
    grid-column: 1;
    grid-row: 1/5;
    width: 72px;
    height: 72px;
    margin: 0;
    border-radius: 20px;
  }
  .quote-card {
    padding-bottom: 18px;
  }
  .quote-content {
    min-height: 140px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .avatar-link img,
  .portrait-link img,
  .quote-enter-active,
  .quote-leave-active {
    transition: none;
  }
  .avatar-link:hover img,
  .avatar-link:focus-visible img,
  .portrait-link:hover img,
  .portrait-link:focus-visible img {
    transform: none;
  }
}
</style>

<style scoped>
.contacts {
  gap: 8px;
}
.contacts a {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: var(--accent-soft);
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    transform 0.28s cubic-bezier(0.2, 0.8, 0.3, 1.4),
    box-shadow 0.28s,
    border-color 0.28s;
}
.contacts a:hover,
.contacts a:focus-visible {
  transform: translateY(-5px) rotate(-6deg);
  border-color: var(--accent);
  box-shadow: 0 7px 16px color-mix(in srgb, var(--accent) 18%, transparent);
}
.contacts a span {
  transition: transform 0.28s;
}
.contacts a:hover span,
.contacts a:focus-visible span {
  transform: scale(1.15) rotate(6deg);
}
.contacts a:active {
  transform: translateY(-1px) scale(0.92);
}
.quote-card {
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 0.35s ease,
    box-shadow 0.35s ease;
}
.quote-shell:hover .quote-card,
.quote-card:has(.quote-trigger:focus-visible) {
  transform: translateY(-4px) rotate(-3deg);
  box-shadow: var(--shadow);
}
.quote-mark {
  display: inline-block;
  transform-origin: bottom left;
  animation: quote-mark-pop 0.65s cubic-bezier(0.2, 0.8, 0.3, 1.3) both;
}
.quote-sparks {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  align-items: start;
  gap: 5px;
  color: var(--gold);
  pointer-events: none;
}
.quote-sparks span {
  display: block;
  animation: quote-spark 0.8s cubic-bezier(0.2, 0.8, 0.3, 1.3) both;
}
.quote-sparks span:last-child {
  margin-top: 15px;
  font-size: 12px;
  animation-delay: 0.08s;
}
.quote-ripple {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    circle at 85% 15%,
    color-mix(in srgb, var(--gold) 25%, transparent),
    transparent 70%
  );
  animation: quote-ripple 0.9s ease-out both;
}
.quote-enter-active {
  transition:
    opacity 0.42s ease,
    transform 0.42s cubic-bezier(0.2, 0.8, 0.3, 1.2),
    filter 0.42s;
}
.quote-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    filter 0.22s;
}
.quote-enter-from {
  opacity: 0;
  transform: translateY(22px) rotate(3deg) scale(0.94);
  filter: blur(5px);
}
.quote-leave-to {
  opacity: 0;
  transform: translateY(-15px) rotate(-3deg) scale(0.97);
  filter: blur(4px);
}
@keyframes quote-mark-pop {
  from {
    opacity: 0;
    transform: rotate(-20deg) scale(0.65);
  }
  to {
    opacity: 1;
    transform: rotate(0) scale(1);
  }
}
@keyframes quote-spark {
  from {
    opacity: 0;
    transform: rotate(-90deg) scale(0.2);
  }
  65% {
    opacity: 1;
    transform: rotate(15deg) scale(1.3);
  }
  to {
    opacity: 0.7;
    transform: rotate(0) scale(1);
  }
}
@keyframes quote-ripple {
  from {
    opacity: 1;
    transform: scale(0.7);
  }
  to {
    opacity: 0;
    transform: scale(1.4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .contacts a,
  .contacts a span,
  .quote-card,
  .quote-enter-active,
  .quote-leave-active {
    transition: none;
  }
  .contacts a:hover,
  .contacts a:focus-visible,
  .contacts a:active,
  .contacts a:hover span,
  .contacts a:focus-visible span,
  .quote-shell:hover .quote-card,
  .quote-card:has(.quote-trigger:focus-visible) {
    transform: none;
  }
  .quote-mark,
  .quote-sparks span,
  .quote-ripple {
    animation: none;
  }
  .quote-enter-from,
  .quote-leave-to {
    transform: none;
    filter: none;
  }
}
</style>

<style scoped>
@container profile (max-width: 175px) {
  .contacts {
    grid-template-columns: repeat(2, 38px);
    justify-content: center;
  }
}
</style>
