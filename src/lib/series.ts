import type { PostSummary } from "./posts";
import type { Language } from "../i18n";

export function groupSeries(
  posts: PostSummary[],
  lang: Language,
): PostSummary[] {
  const grouped = new Map<string, PostSummary[]>();
  for (const post of posts) {
    if (!post.series) continue;
    const episodes = grouped.get(post.series.id) ?? [];
    episodes.push(post);
    grouped.set(post.series.id, episodes);
  }
  const seen = new Set<string>();
  return posts.flatMap((post) => {
    if (!post.series) return [post];
    const id = post.series.id;
    if (seen.has(id)) return [];
    seen.add(id);
    const episodes = [...(grouped.get(id) ?? [post])].sort(
      (a, b) => (a.series?.episode ?? 0) - (b.series?.episode ?? 0),
    );
    const first = episodes.reduce(
      (first, item) =>
        (item.series?.episode ?? 0) < (first.series?.episode ?? 0)
          ? item
          : first,
      post,
    );
    return [
      {
        ...first,
        title: post.series.name[lang],
        tags: [...new Set(episodes.flatMap((episode) => episode.tags))],
        featured: episodes.some((episode) => episode.featured),
      },
    ];
  });
}
