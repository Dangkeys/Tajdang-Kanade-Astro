import { getCollection, type CollectionEntry } from "astro:content";
import { categoryNames } from "../data/post-options";
import { language, type Language } from "../i18n";

import { getPostId } from "./post-paths";
export { getPostId } from "./post-paths";

export type PostSummary = {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  coverImage?: string;
  coverFit?: "cover" | "contain";
  series?: NonNullable<CollectionEntry<"posts">["data"]["series"]>;
  featured: boolean;
  minutes: number;
};
export const categories = categoryNames;

export async function getPosts(lang: Language = language) {
  return (
    await getCollection(
      "posts",
      ({ data }) => !data.draft && data.lang === lang,
    )
  ).sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      b.data.date.valueOf() - a.data.date.valueOf(),
  );
}
export function summarize(post: CollectionEntry<"posts">): PostSummary {
  return {
    id: getPostId(post),
    ...post.data,
    coverImage:
      post.data.coverImage ??
      post.data.media.find((item) => item.type === "image")?.src,
    date: post.data.date.toISOString().slice(0, 10),
    minutes: readingMinutes(post.body ?? "", post.data.lang),
  };
}
function readingMinutes(body: string, lang: string): number {
  const length =
    lang === "en"
      ? body.trim().split(/\s+/).filter(Boolean).length
      : body.length;
  const rate = lang === "en" ? 200 : lang === "ja" ? 500 : 400;
  return Math.max(1, Math.ceil(length / rate));
}
export function getTags(posts: PostSummary[]) {
  return [...new Set(posts.flatMap((post) => post.tags))];
}
