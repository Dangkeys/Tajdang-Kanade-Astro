import { slug } from "github-slugger";

// Match Astro's glob loader, including explicit slugs and folder index notes.
export function getPostEntryId({
  entry,
  slug: customSlug,
}: {
  entry: string;
  slug?: unknown;
}): string {
  if (customSlug) return String(customSlug);
  return entry
    .replace(/\.md$/, "")
    .split("/")
    .map((part) => slug(part))
    .join("/")
    .replace(/\/index$/, "");
}

export function getPostId(post: {
  id: string;
  data: { lang: string; category: string };
}): string {
  const languagePrefix = `${post.data.lang.toLowerCase()}/`;
  const path = post.id.startsWith(languagePrefix)
    ? post.id.slice(languagePrefix.length)
    : post.id;
  // Category folders organize source files without changing public URLs.
  const categoryPrefix = `${post.data.category}/`;
  return path.startsWith(categoryPrefix)
    ? path.slice(categoryPrefix.length)
    : path;
}
