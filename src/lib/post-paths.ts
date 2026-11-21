export function getPostId(post: {
  id: string;
  data: { lang: string };
}): string {
  const prefix = `${post.data.lang}/`;
  return post.id.startsWith(prefix) ? post.id.slice(prefix.length) : post.id;
}
