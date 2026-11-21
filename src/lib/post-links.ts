import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";
import { htmlToHast, type HastNode } from "satteri";
import { getPostId } from "./post-paths";

export const postLinkSchema = z.object({
  href: z.string(),
  label: z.string(),
});

export function extractPostLinks(
  html: string,
): z.infer<typeof postLinkSchema>[] {
  const links: z.infer<typeof postLinkSchema>[] = [];
  function text(node: HastNode): string {
    if (node.type === "text") return node.value;
    return "children" in node ? node.children.map(text).join("") : "";
  }
  function collect(node: HastNode) {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties.href;
      if (typeof href === "string")
        links.push({ href, label: text(node).trim() || href });
    }
    if ("children" in node) node.children.forEach(collect);
  }
  collect(htmlToHast(html, { fragment: true }));
  return links;
}

type LinkedPost = {
  id: string;
  data: Pick<
    CollectionEntry<"posts">["data"],
    "title" | "description" | "lang" | "draft" | "links"
  >;
};

type PostConnection = {
  kind: "post";
  href: string;
  title: string;
  description: string;
  lang: LinkedPost["data"]["lang"];
};

type Connection =
  | PostConnection
  | {
      kind: "link";
      href: string;
      title: string;
      description: string;
    };

function postConnection(post: LinkedPost): PostConnection {
  const prefix = post.data.lang === "th" ? "/th" : "";
  const path = getPostId(post).split("/").map(encodeURIComponent).join("/");
  return {
    kind: "post",
    href: `${prefix}/posts/${path}/`,
    title: post.data.title,
    description: post.data.description,
    lang: post.data.lang,
  };
}

export function getPostConnections({
  post,
  posts,
  site,
}: {
  post: LinkedPost;
  posts: LinkedPost[];
  site: URL;
}) {
  const published = posts.filter((entry) => !entry.data.draft);
  const paths = new Map(
    posts.map((entry) => [
      decodeURIComponent(postConnection(entry).href),
      entry,
    ]),
  );
  function resolveLink(href: string, source: LinkedPost) {
    if (href.startsWith("#")) return;
    const base = new URL(postConnection(source).href, site);
    const url = URL.parse(href, base);
    if (!url || !["http:", "https:", "mailto:", "tel:"].includes(url.protocol))
      return;
    let target: LinkedPost | undefined;
    if (url.origin === site.origin) {
      try {
        const path = `${decodeURIComponent(url.pathname).replace(/\/+$/, "")}/`;
        target = paths.get(path);
      } catch {
        // Invalid URL escapes must not prevent an otherwise readable post rendering.
      }
    }
    return { url, target };
  }
  const outgoing = new Map<string, Connection>();
  for (const link of post.data.links) {
    const resolved = resolveLink(link.href, post);
    if (
      !resolved ||
      resolved.target?.id === post.id ||
      resolved.target?.data.draft
    )
      continue;
    if (resolved.target) {
      outgoing.set(resolved.target.id, postConnection(resolved.target));
    } else {
      outgoing.set(resolved.url.href, {
        kind: "link",
        href: link.href,
        title: link.label,
        description: resolved.url.href,
      });
    }
  }
  const backlinks = published
    .filter(
      (entry) =>
        entry.id !== post.id &&
        entry.data.links.some(
          (link) => resolveLink(link.href, entry)?.target?.id === post.id,
        ),
    )
    .map(postConnection)
    .sort((a, b) => a.title.localeCompare(b.title, post.data.lang));
  return { outgoing: [...outgoing.values()], backlinks };
}
