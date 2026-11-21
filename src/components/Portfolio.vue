<script setup lang="ts">
import { computed, onMounted, ref, useId, nextTick, watch } from "vue";
import { translator, homePath, type Language } from "../i18n";
import type { PostSummary } from "../lib/posts";
import { groupSeries } from "../lib/series";
import { personalInfo } from "../config";
import PostCover from "./posts/PostCover.vue";
import TagTree from "./TagTree.vue";
import { buildTagTree, matchesTag, tagBreadcrumb, tagLabel } from "../lib/tags";
const props = defineProps<{
  posts: PostSummary[];
  lang: Language;
  avatarSrc: string;
  portraitSrc: string;
}>();
const t = translator(props.lang);
const home = homePath(props.lang);
const th = props.lang === "th";
const query = ref("");
const page = ref(1);
const pageSize = 4;
const feedStart = ref<HTMLElement>();
const searchFocused = ref(false);
const activeSuggestion = ref(-1);
const suggestionList = ref<HTMLElement>();
const suggestionListId = `${useId()}-suggestions`;
type Suggestion =
  | { kind: "post"; label: string; detail: string; href: string; key: string }
  | { kind: "tag"; label: string; detail: string; path: string; key: string };
const category = ref("");
const selectedTags = ref<string[]>([]);
const tagMatch = ref<"any" | "all">("any");
const quoteIndex = ref(0);
const quotes = [
  {
    en: "Never stop learning, because life never stop teaching",
    th: "Never stop learning, because life never stop teaching",
  },
  {
    en: "The more I learn, the more I realize how much I don't know",
    th: "The more I learn, the more I realize how much I don't know",
  },
];
const currentQuote = computed(() => {
  const quote = quotes[quoteIndex.value % quotes.length];
  return th ? quote?.th : quote?.en;
});
function nextQuote() {
  quoteIndex.value = (quoteIndex.value + 1) % quotes.length;
}
const groups = ["blogs", "projects", "work-experience", "activities"] as const;
const labels = {
  blogs: t("category.blogs"),
  projects: t("category.projects"),
  "work-experience": t("category.work-experience"),
  activities: t("category.activities"),
};
const categoryIcons = {
  blogs: "icon-[lucide--coffee]",
  projects: "icon-[lucide--code-xml]",
  "work-experience": "icon-[lucide--briefcase-business]",
  activities: "icon-[lucide--trophy]",
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
      `${post.title} ${post.description} ${post.series?.name[props.lang] ?? ""} ${post.tags.join(" ")}`
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
);
const feedEntries = computed(() => groupSeries(filtered.value, props.lang));
const pageCount = computed(() =>
  Math.max(1, Math.ceil(feedEntries.value.length / pageSize)),
);
const currentPage = computed(() => Math.min(page.value, pageCount.value));
const displayed = computed(() =>
  feedEntries.value.slice(
    (currentPage.value - 1) * pageSize,
    currentPage.value * pageSize,
  ),
);
watch(
  [query, category, selectedTags, tagMatch],
  () => {
    page.value = 1;
  },
  { flush: "sync" },
);
function changePage(value: number) {
  page.value = Math.max(1, Math.min(value, pageCount.value));
  sync();
  closeSuggestions();
  nextTick(() =>
    feedStart.value?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    }),
  );
}
const suggestions = computed<Suggestion[]>(() => {
  const needle = query.value.trim().toLowerCase();
  const posts: Suggestion[] = categoryPosts.value
    .filter((post) =>
      `${post.title} ${post.description} ${post.series?.name[props.lang] ?? ""} ${post.tags.join(" ")}`
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 4)
    .map((post) => ({
      kind: "post",
      label: post.title,
      detail: `${th ? "บทความ" : "Post"} · ${categoryTitle(post.category)}`,
      href: `${home}posts/${post.id}/`,
      key: `post:${post.id}`,
    }));
  const paths = new Set<string>();
  categoryPosts.value.forEach((post) =>
    post.tags.forEach((path) => {
      const segments = path.split("/");
      segments.forEach((_, index) =>
        paths.add(segments.slice(0, index + 1).join("/")),
      );
    }),
  );
  const tags: Suggestion[] = [...paths]
    .filter(
      (path) =>
        path.toLowerCase().includes(needle) &&
        !selectedTags.value.includes(path),
    )
    .map((path) => ({
      kind: "tag",
      label: tagBreadcrumb(path),
      detail: th ? "แท็ก" : "Tag",
      path,
      key: `tag:${path}`,
    }));
  return [...posts, ...(needle ? tags : [])].slice(0, 8);
});
const showSuggestions = computed(() => searchFocused.value);
function closeSuggestions() {
  searchFocused.value = false;
  activeSuggestion.value = -1;
}
function searchFocusOut(event: FocusEvent) {
  if (
    event.currentTarget instanceof Node &&
    event.relatedTarget instanceof Node &&
    event.currentTarget.contains(event.relatedTarget)
  )
    return;
  closeSuggestions();
}
function updateSearch() {
  searchFocused.value = true;
  activeSuggestion.value = -1;
  sync();
}
function moveSuggestion(direction: number) {
  searchFocused.value = true;
  const length = suggestions.value.length;
  if (!length) return;
  activeSuggestion.value =
    activeSuggestion.value < 0
      ? direction > 0
        ? 0
        : length - 1
      : (activeSuggestion.value + direction + length) % length;
  nextTick(() =>
    suggestionList.value
      ?.querySelectorAll<HTMLElement>("[role='option']")
      [activeSuggestion.value]?.scrollIntoView({ block: "nearest" }),
  );
}
function activateSuggestion() {
  if (!showSuggestions.value) return;
  const position = activeSuggestion.value < 0 ? 0 : activeSuggestion.value;
  suggestionList.value
    ?.querySelectorAll<HTMLElement>("[role='option']")
    [position]?.click();
}
function applySuggestion(suggestion: Suggestion) {
  query.value = "";
  if (suggestion.kind === "tag") {
    selectedTags.value = [...new Set([...selectedTags.value, suggestion.path])];
    sync();
  }
  closeSuggestions();
}
function categoryTitle(value: string) {
  const group = groups.find((group) => group === value);
  return group ? labels[group] : value;
}

function sync() {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries({
    q: query.value,
    page: currentPage.value > 1 ? String(currentPage.value) : "",
    category: category.value,
    match: tagMatch.value === "all" ? "all" : "",
  }))
    value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  url.searchParams.delete("tag");
  selectedTags.value.forEach((tag) => url.searchParams.append("tag", tag));
  window.history.replaceState(window.history.state, "", url);
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
  category.value = ["skills", "personal"].includes(requestedCategory)
    ? "blogs"
    : requestedCategory;
  selectedTags.value = [...new Set(params.getAll("tag"))];
  const requestedPage = Number(params.get("page"));
  page.value =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, pageCount.value)
      : 1;
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
          ><img :src="avatarSrc" alt="Tajdang" width="88" height="88"
        /></a>
        <h2>Tajdang<span class="accent">.</span></h2>
        <p class="role">{{ t("author.role") }}</p>
        <p class="muted">{{ t("author.bio") }}</p>

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
    <section
      ref="feedStart"
      class="portfolio-work"
      aria-labelledby="work-title"
    >
      <div class="portfolio-intro">
        <span class="eyebrow">{{
          th ? "เรื่องเล่าจากมุมของผม" : "A LITTLE BIT OF TAJDANG"
        }}</span>
        <h2 id="work-title">
          {{ th ? "ช่วงนี้ผมทำอะไรบ้าง" : "What I’m up to" }}
        </h2>
        <p class="muted">
          {{ th ? "ผมทําอะไรบ้างกันนะะ " : "Things I did." }}
        </p>
      </div>
      <div class="search-area" @focusout="searchFocusOut">
        <label class="portfolio-search card"
          ><span
            class="search-symbol icon-[lucide--search]"
            aria-hidden="true"
          ></span
          ><input
            v-model="query"
            @input="updateSearch"
            @focus="searchFocused = true"
            @click="searchFocused = true"
            @keydown.down.prevent="moveSuggestion(1)"
            @keydown.up.prevent="moveSuggestion(-1)"
            @keydown.enter.prevent="activateSuggestion"
            @keydown.esc.stop.prevent="closeSuggestions"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="showSuggestions"
            :aria-controls="suggestionListId"
            :aria-activedescendant="
              activeSuggestion >= 0 && showSuggestions
                ? `${suggestionListId}-${activeSuggestion}`
                : undefined
            "
            :aria-label="th ? 'ค้นหาผลงาน' : 'Search my work'"
            :placeholder="
              th ? 'ค้นหาอะไรดีน้าาา' : 'Search projects, skills, or a topic…'
            "
        /></label>
        <Transition name="suggestions"
          ><div
            v-if="showSuggestions"
            :id="suggestionListId"
            ref="suggestionList"
            class="search-suggestions card"
            role="listbox"
            :aria-label="th ? 'คำแนะนำการค้นหา' : 'Search suggestions'"
          >
            <p class="suggestion-heading">
              {{
                query.trim()
                  ? th
                    ? "ผลการค้นหา"
                    : "Search results"
                  : th
                    ? "โพสต์ล่าสุด"
                    : "Recent posts"
              }}
            </p>
            <template
              v-for="(suggestion, position) in suggestions"
              :key="suggestion.key"
            >
              <p
                v-if="
                  suggestion.kind === 'tag' &&
                  suggestions[position - 1]?.kind !== 'tag'
                "
                class="suggestion-section"
              >
                {{ th ? "กรองตามหัวข้อ" : "Filter by topic" }}
              </p>
              <a
                v-if="suggestion.kind === 'post'"
                :id="`${suggestionListId}-${position}`"
                :href="suggestion.href"
                role="option"
                :aria-selected="activeSuggestion === position"
                tabindex="-1"
                class="suggestion-item"
                :class="{ highlighted: activeSuggestion === position }"
                @pointerenter="activeSuggestion = position"
                @click="closeSuggestions"
                ><span
                  class="suggestion-icon icon-[lucide--file-text]"
                  aria-hidden="true"
                ></span
                ><span class="suggestion-copy"
                  ><span>{{ suggestion.label }}</span
                  ><small>{{ suggestion.detail }}</small></span
                ></a
              >
              <button
                v-else
                :id="`${suggestionListId}-${position}`"
                type="button"
                role="option"
                :aria-selected="activeSuggestion === position"
                tabindex="-1"
                class="suggestion-item"
                :class="{ highlighted: activeSuggestion === position }"
                @pointerenter="activeSuggestion = position"
                @click="applySuggestion(suggestion)"
              >
                <span
                  class="suggestion-icon"
                  :class="
                    suggestion.kind === 'tag'
                      ? 'icon-[lucide--tags]'
                      : 'icon-[lucide--folder-open]'
                  "
                  aria-hidden="true"
                ></span
                ><span class="suggestion-copy"
                  ><span>{{ suggestion.label }}</span
                  ><small>{{ suggestion.detail }}</small></span
                >
              </button>
            </template>
            <p v-if="!suggestions.length" class="suggestion-empty">
              {{
                th
                  ? "ยังไม่พบ ลองค้นหาด้วยคำอื่นได้ครับ"
                  : "Nothing yet—try another word."
              }}
            </p>
            <p class="suggestion-footer">
              {{
                th
                  ? "↑ ↓ เพื่อเลือก · Enter เพื่อเปิด · Esc เพื่อปิด"
                  : "↑ ↓ to choose · Enter to open · Esc to close"
              }}
            </p>
          </div></Transition
        >
      </div>
      <div
        class="portfolio-filters"
        :aria-label="th ? 'หมวดหมู่' : 'Categories'"
      >
        <button
          :class="{ selected: !category }"
          :aria-pressed="!category"
          @click="choose('')"
        >
          <span
            class="category-icon icon-[lucide--layers]"
            aria-hidden="true"
          ></span
          ><span class="category-label">{{
            th ? "ทั้งหมด" : "Everything"
          }}</span></button
        ><button
          v-for="group in groups"
          :key="group"
          :class="{ selected: category === group }"
          :aria-pressed="category === group"
          @click="choose(group)"
        >
          <span
            class="category-icon"
            :class="categoryIcons[group]"
            aria-hidden="true"
          ></span
          ><span class="category-label">{{ labels[group] }}</span>
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
          v-for="post in displayed"
          :key="post.id"
          class="card portfolio-post"
        >
          <a
            :href="`${home}posts/${post.id}/`"
            :aria-label="post.title"
            class="post-tile"
            :class="post.category"
            ><PostCover
              :image="post.coverImage"
              :kind="post.cover"
              :fit="post.coverFit"
          /></a>
          <div class="post-copy">
            <div class="post-kicker">
              <span v-if="post.featured" class="starred-post"
                ><span class="icon-[lucide--star]" aria-hidden="true"></span
                >{{ th ? "ปักหมุด" : "Pinned" }}</span
              ><span class="eyebrow">{{ categoryTitle(post.category) }}</span>
              <span v-if="post.series" class="series-badge">{{
                th ? "ซีรีส์" : "Series"
              }}</span>
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
            {{ th ? "ตรงนี้ยังไม่มีโพสต์ครับ" : "Nothing here yet" }}
          </h3>
          <p>
            {{
              th
                ? "ผมกำลังทยอยเพิ่มโพสต์ครับ ลองเปลี่ยนหมวดหมู่หรือแท็ก หรือล้างตัวกรองเพื่อดูโพสต์ที่มีอยู่"
                : "I'm adding posts a little at a time. Try changing the category or tags, or clear the filters to see what's available."
            }}
          </p>
          <button class="btn secondary" @click="reset">
            {{ th ? "ล้างตัวกรอง" : "Clear filters" }}
          </button>
        </div>
      </TransitionGroup>
      <nav
        v-if="pageCount > 1"
        class="feed-pagination"
        :aria-label="th ? 'หน้าโพสต์' : 'Post pages'"
      >
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          {{ th ? "ก่อนหน้า" : "Previous" }}
        </button>
        <button
          v-for="number in pageCount"
          :key="number"
          type="button"
          :aria-current="currentPage === number ? 'page' : undefined"
          :class="{ selected: currentPage === number }"
          @click="changePage(number)"
        >
          {{ number }}
        </button>
        <button
          type="button"
          :disabled="currentPage === pageCount"
          @click="changePage(currentPage + 1)"
        >
          {{ th ? "ถัดไป" : "Next" }}
        </button>
      </nav>
    </section>
    <aside class="portfolio-right">
      <figure class="card portrait-card">
        <a
          class="portrait-link"
          :href="`${home}posts/about-me/`"
          :aria-label="th ? 'รู้จัก Tajdang' : 'About Tajdang'"
        >
          <img
            :src="portraitSrc"
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
            th ? "A NOTE TO MYSELF" : "A NOTE TO MYSELF"
          }}</span>
          <button
            class="quote-trigger"
            type="button"
            @click="nextQuote"
            :aria-label="th ? 'อ่านข้อคิดถัดไป' : 'Show another thought'"
            :title="th ? 'อ่านข้อคิดถัดไป' : 'Show another thought'"
          >
            <span
              class="quote-action icon-[lucide--refresh-cw]"
              aria-hidden="true"
            ></span>
          </button>
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
  height: 160px;
  align-self: start;
  overflow: hidden;
  border-radius: 11px;
  background: var(--plum-soft);
  color: var(--plum);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 160px;
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
    order: 2;
  }
  .portfolio-right {
    order: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
  .portfolio-post {
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 14px;
  }
  .post-tile {
    min-height: 160px;
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
  .portfolio-profile {
    grid-row: 1 / span 2;
  }
  .portfolio-work {
    grid-column: 2;
    grid-row: 2;
  }
  .portfolio-right {
    grid-column: 2;
    grid-row: 1;
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
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}
.quote-shell:hover .quote-card,
.quote-card:has(.quote-trigger:focus-visible) {
  border-color: var(--accent);
  box-shadow: 0 5px 20px color-mix(in srgb, var(--accent) 12%, transparent);
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
  transform: translateY(22px) scale(0.94);
  filter: blur(5px);
}
.quote-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.97);
  filter: blur(4px);
}
@keyframes quote-mark-pop {
  from {
    opacity: 0;
    transform: scale(0.65);
  }
  to {
    opacity: 1;
    transform: scale(1);
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
    transform: scale(1);
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

<style scoped>
.search-area {
  position: relative;
  z-index: 10;
}
.portfolio-search {
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.search-symbol {
  flex-shrink: 0;
  font-size: 20px;
  transition: transform 0.25s;
}
.search-area:focus-within .search-symbol {
  transform: rotate(-12deg) scale(1.12);
}
.search-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  padding: 8px;
  max-height: min(420px, 55dvh);
  overflow-y: auto;
  box-shadow: 0 12px 32px #00000018;
}
.suggestion-heading {
  margin: 8px 10px 10px;
  color: var(--muted);
  font-size: 12px;
}
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  text-align: left;
}
.suggestion-item.highlighted,
.suggestion-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.suggestion-icon {
  flex-shrink: 0;
  font-size: 19px;
  color: var(--accent);
  transition: transform 0.2s;
}
.suggestion-item:hover .suggestion-icon,
.suggestion-item.highlighted .suggestion-icon {
  transform: rotate(-8deg) scale(1.1);
}
.suggestion-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 14px;
}
.suggestion-copy small {
  font-size: 11px;
  color: var(--muted);
}
.suggestion-footer {
  margin: 8px 10px 4px;
  padding-top: 9px;
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--muted);
}
.suggestion-empty {
  margin: 18px 12px;
  font-size: 14px;
  color: var(--muted);
}
.suggestions-enter-active,
.suggestions-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.suggestions-enter-from,
.suggestions-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.portfolio-filters button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  transition:
    color 0.22s,
    background 0.22s,
    border-color 0.22s,
    box-shadow 0.22s;
}
.portfolio-filters button::after {
  content: "";
  position: absolute;
  height: 2px;
  left: 12px;
  right: 12px;
  bottom: 3px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s;
  opacity: 0.6;
}
.portfolio-filters button:hover,
.portfolio-filters button:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 12%, transparent);
}
.portfolio-filters button.selected:hover,
.portfolio-filters button.selected:focus-visible {
  color: var(--on-accent);
  background: var(--accent);
}
.portfolio-filters button:hover::after,
.portfolio-filters button:focus-visible::after {
  transform: scaleX(1);
}
.category-icon {
  display: inline-block;
  font-size: 16px;
  flex-shrink: 0;
}
.portfolio-filters button:hover .category-icon,
.portfolio-filters button:focus-visible .category-icon {
  animation: category-wiggle 0.8s ease-in-out infinite alternate;
}
.category-label {
  transition: transform 0.2s;
}
.portfolio-filters button:hover .category-label {
  transform: translateY(-1px);
}
.portfolio-filters button:active .category-icon {
  transform: scale(0.85);
}
@keyframes category-wiggle {
  from {
    transform: translateY(1px) rotate(-8deg);
  }
  to {
    transform: translateY(-2px) rotate(8deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .search-symbol,
  .suggestion-icon,
  .suggestions-enter-active,
  .suggestions-leave-active,
  .portfolio-filters button,
  .portfolio-filters button::after,
  .category-label {
    transition: none;
  }
  .portfolio-filters button:hover .category-icon,
  .portfolio-filters button:focus-visible .category-icon {
    animation: none;
  }
  .search-area:focus-within .search-symbol,
  .suggestion-item:hover .suggestion-icon,
  .suggestion-item.highlighted .suggestion-icon,
  .portfolio-filters button:hover .category-label {
    transform: none;
  }
}
</style>

<style scoped>
.quote-action {
  position: absolute;
  right: 18px;
  bottom: 18px;
  font-size: 18px;
  color: var(--accent);
  opacity: 0.6;
  transition:
    opacity 0.2s,
    transform 0.45s;
}
.quote-shell:hover .quote-action,
.quote-trigger:focus-visible .quote-action {
  opacity: 1;
  transform: rotate(180deg);
}
.quote-trigger:active .quote-action {
  transform: rotate(180deg) scale(0.85);
}
@media (prefers-reduced-motion: reduce) {
  .quote-action {
    transition: none;
  }
  .quote-shell:hover .quote-action,
  .quote-trigger:focus-visible .quote-action,
  .quote-trigger:active .quote-action {
    transform: none;
  }
}
</style>

<style scoped>
.portfolio-work,
.portfolio-profile,
.portfolio-right {
  min-width: 0;
}
</style>

<style scoped>
.feed-pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.feed-pagination button {
  min-width: 38px;
  min-height: 38px;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--card);
  color: var(--text);
  font-size: 14px;
}
.feed-pagination button:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.feed-pagination button.selected {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
}
.portfolio-work {
  scroll-margin-top: 24px;
}
</style>

<style scoped>
.suggestion-section {
  margin: 8px 10px 4px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
}
</style>

<style scoped>
.series-badge {
  color: var(--accent);
  font-size: 12px;
}
</style>
