import type { PostSummary } from "./posts";

export function groupSeries(posts: PostSummary[]): PostSummary[] {
  const grouped = new Map<string, PostSummary[]>();
  for (const post of posts) {
    if (!post.series) continue;
    const episodes = grouped.get(post.series.name) ?? [];
    episodes.push(post);
    grouped.set(post.series.name, episodes);
  }
  const seen = new Set<string>();
  return posts.flatMap((post) => {
    if (!post.series) return [post];
    const name = post.series.name;
    if (seen.has(name)) return [];
    seen.add(name);
    const episodes = [...(grouped.get(name) ?? [post])].sort(
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
        title: name,
        tags: [...new Set(episodes.flatMap((episode) => episode.tags))],
        featured: episodes.some((episode) => episode.featured),
      },
    ];
  });
}
