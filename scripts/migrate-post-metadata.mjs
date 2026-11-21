import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { resolve, dirname, relative, sep } from "node:path";
import { parseFrontmatter } from "astro/markdown";
import { slug } from "github-slugger";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

export function translatedFrontmatter(data) {
  const lines = [
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description)}`,
  ];
  if (data.mediaText) {
    lines.push("mediaText:");
    for (const [id, text] of Object.entries(data.mediaText)) {
      lines.push(`  ${id}:`);
      for (const [key, value] of Object.entries(text)) {
        lines.push(`    ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  return lines.join("\n");
}

export function migratePosts() {
  const root = resolve("src/content/posts");
  const files = readdirSync(root, { recursive: true }).filter((file) =>
    /^(en|th)\/.*\.md$/.test(file),
  );
  if (!files.length) {
    console.log("Posts already use shared metadata; nothing to migrate.");
    return;
  }
  const sharedKeys = [
    "date",
    "category",
    "tags",
    "cover",
    "coverImage",
    "featured",
    "draft",
    "slug",
  ];
  const plans = files.map((entry) => {
    const source = resolve(root, entry);
    const contents = readFileSync(source, "utf8");
    const { frontmatter: data } = parseFrontmatter(contents);
    if (
      process.argv.includes("--about-me-avatar-only") &&
      entry.endsWith("/blogs/about-me.md")
    ) {
      data.media = data.media?.filter(
        (item) =>
          item.type === "image" && item.src === "/images/tajdang-avatar.png",
      );
    }
    const lang = entry.split("/")[0];
    const folder = entry.replace(/^(en|th)\//, "").replace(/\.md$/, "");
    const target = resolve(root, folder, `${lang}.md`);
    const originalId =
      data.slug ||
      entry
        .replace(/\.md$/, "")
        .split("/")
        .map((part) => slug(part))
        .join("/")
        .replace(/\/index$/, "");
    const publicId = originalId
      .replace(new RegExp(`^${lang}/`), "")
      .replace(new RegExp(`^${data.category}/`), "");
    const shared = Object.fromEntries(
      sharedKeys
        .filter((key) => data[key] !== undefined)
        .map((key) => [key, data[key]]),
    );
    shared.slug = publicId;
    shared.date = new Date(data.date).toISOString().slice(0, 10);
    const translated = { title: data.title, description: data.description };
    if (data.media?.length) {
      shared.media = data.media.map(
        ({ alt, title, caption, ...asset }, index) => ({
          id: `media-${index + 1}`,
          ...asset,
        }),
      );
      translated.mediaText = Object.fromEntries(
        data.media.map(({ alt, title, caption }, index) => [
          `media-${index + 1}`,
          Object.fromEntries(
            Object.entries({ alt, title, caption }).filter(
              ([, value]) => value !== undefined,
            ),
          ),
        ]),
      );
    }
    // Preserve every body character, including comments and the author's formatting.
    const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(contents);
    if (!match) throw new Error(`Missing frontmatter: ${entry}`);
    return {
      source,
      target,
      shared,
      translated,
      body: contents.slice(match[0].length),
    };
  });
  const metadata = new Map();
  for (const plan of plans) {
    const file = resolve(dirname(plan.target), "post.json");
    const previous = metadata.get(file);
    if (previous) {
      for (const key of Object.keys(plan.shared)) {
        if (
          previous[key] !== undefined &&
          !isDeepStrictEqual(previous[key], plan.shared[key])
        ) {
          throw new Error(
            `EN/TH metadata differ: ${file}, field ${key}. Resolve before migrating.`,
          );
        }
      }
      Object.assign(previous, plan.shared);
      plan.shared = previous;
    } else metadata.set(file, plan.shared);
  }
  const destinations = new Map(plans.map((plan) => [plan.source, plan.target]));
  for (const plan of plans) {
    const body = plan.body.replace(
      /(\]\(|^\s*\[[^\]]+\]:\s*)([^\s)]+)(?=[\s)]|$)/gm,
      (match, prefix, url) => {
        if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return match;
        const parts = /^([^?#]+)(.*)$/.exec(url);
        if (!parts || !decodeURIComponent(parts[1]).endsWith(".md"))
          return match;
        const oldTarget = resolve(
          dirname(plan.source),
          decodeURIComponent(parts[1]),
        );
        const target = destinations.get(oldTarget);
        if (!target) throw new Error(`Cannot migrate ${plan.source}: ${url}`);
        return (
          prefix +
          relative(dirname(plan.target), target)
            .split(sep)
            .map(encodeURIComponent)
            .join("/") +
          parts[2]
        );
      },
    );
    mkdirSync(dirname(plan.target), { recursive: true });
    writeFileSync(
      plan.target,
      `---\n${translatedFrontmatter(plan.translated)}\n---\n${body}`,
    );
  }
  for (const [file, data] of metadata)
    writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  for (const plan of plans) rmSync(plan.source);
  for (const lang of ["en", "th"]) {
    const directory = resolve(root, lang);
    const folders = readdirSync(directory, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(entry.parentPath, entry.name))
      .sort((a, b) => b.length - a.length);
    for (const folder of [...folders, directory]) {
      try {
        rmdirSync(folder);
      } catch (error) {
        if (error.code !== "ENOTEMPTY") throw error;
      }
    }
  }
  console.log(
    `Migrated ${plans.length} translations into ${metadata.size} shared post folders.`,
  );
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  migratePosts();
}
