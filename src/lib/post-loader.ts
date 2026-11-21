import { readdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Loader } from "astro/loaders";
import { readPost } from "./post-metadata";
import { extractPostLinks } from "./post-links";

export function sharedPostLoader(): Loader {
  return {
    name: "shared-post-metadata",
    async load(context) {
      const root = fileURLToPath(context.config.root);
      const directory = resolve(root, "src/content/posts");
      async function sync() {
        const files = (await readdir(directory, { recursive: true }))
          .filter((file) => /(?:^|[/\\])(?:en|th)\.md$/.test(file))
          .sort();
        const posts = files.map((file) => {
          const filePath = resolve(directory, file);
          return { ...readPost(filePath), filePath };
        });
        const ids = new Set<string>();
        for (const post of posts) {
          if (ids.has(post.id))
            throw new Error(
              `Duplicate post URL: ${post.id}. Use a unique slug in post.json.`,
            );
          ids.add(post.id);
        }
        // Changed URLs or publish status also affect links rendered in other posts.
        const routes = posts.map((post) => [post.id, post.data.draft]);
        const untouched = new Set(context.store.keys());
        for (const post of posts) {
          untouched.delete(post.id);
          const digest = context.generateDigest({
            data: post.data,
            filePath: post.filePath,
            body: post.body,
            routes,
            linkMetadataVersion: 2,
          });
          if (context.store.get(post.id)?.digest === digest) continue;
          const rendered = await context.renderMarkdown(post.body, {
            fileURL: pathToFileURL(post.filePath),
          });
          const data = await context.parseData({
            id: post.id,
            data: {
              ...post.data,
              links: extractPostLinks(rendered.html),
            },
            filePath: post.filePath,
          });
          context.store.set({
            id: post.id,
            data,
            body: post.body,
            filePath: relative(root, post.filePath).split(sep).join("/"),
            digest,
            rendered,
            assetImports: rendered.metadata?.imagePaths,
          });
        }
        for (const id of untouched) context.store.delete(id);
      }
      await sync();
      if (!context.watcher) return;
      context.watcher.add(directory);
      let pending = Promise.resolve();
      const changed = (file: string) => {
        const entry = relative(directory, resolve(file));
        if (
          isAbsolute(entry) ||
          entry === ".." ||
          entry.startsWith(`..${sep}`) ||
          !/(?:^|[/\\])(?:post\.json|series\.json|en\.md|th\.md)$/.test(entry)
        )
          return;
        pending = pending.then(sync).catch((error) => {
          context.logger.error(
            error instanceof Error ? error.message : String(error),
          );
        });
      };
      context.watcher.on("add", changed);
      context.watcher.on("change", changed);
      context.watcher.on("unlink", changed);
    },
  };
}
