import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";
import { slug } from "github-slugger";
import { getPostId } from "./post-paths";
import { readPost } from "./post-metadata";

export function relativePostLinks({
  postsDirectory = resolve("src/content/posts"),
}: { postsDirectory?: string } = {}): NonNullable<
  SatteriProcessorOptions["mdastPlugins"]
> {
  function entryPath(file: string): string | undefined {
    const entry = relative(postsDirectory, file);
    if (entry === ".." || entry.startsWith(`..${sep}`) || isAbsolute(entry))
      return;
    return entry.split(sep).join("/");
  }

  function rewrite(url: string, source: string): string {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return url;
    const hashAt = url.indexOf("#");
    const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
    const queryAt = beforeHash.indexOf("?");
    const pathname = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
    const decodedPath = decodeURIComponent(pathname);
    if (!decodedPath.endsWith(".md")) return url;

    const target = resolve(dirname(source), decodedPath);
    const entry = entryPath(target);
    if (!entry || basename(target).startsWith("_")) {
      throw new Error(
        `${source}: Markdown link "${url}" must point to a published note inside src/content/posts.`,
      );
    }
    let post: ReturnType<typeof readPost>;
    try {
      post = readPost(target);
    } catch (error) {
      throw new Error(
        `${source}: Cannot resolve Markdown link "${url}" to ${target}.`,
        { cause: error },
      );
    }
    const { lang } = post.data;
    if (post.data.draft) {
      throw new Error(
        `${source}: Markdown link "${url}" targets a draft or invalid post.`,
      );
    }
    const id = getPostId(post);
    const path = `${lang === "th" ? "/th" : ""}/posts/${id.split("/").map(encodeURIComponent).join("/")}/`;
    const query = queryAt < 0 ? "" : beforeHash.slice(queryAt);
    // Obsidian uses heading text; Astro generates GitHub-style heading IDs.
    const hash =
      hashAt < 0 ? "" : `#${slug(decodeURIComponent(url.slice(hashAt + 1)))}`;
    return path + query + hash;
  }

  return [
    (context) => {
      if (!context.fileURL) return;
      const source = fileURLToPath(context.fileURL);
      if (!entryPath(source)) return;
      return {
        name: "relative-post-links",
        link(node, ctx) {
          ctx.setProperty(node, "url", rewrite(node.url, source));
        },
        definition(node, ctx) {
          ctx.setProperty(node, "url", rewrite(node.url, source));
        },
      };
    },
  ];
}
