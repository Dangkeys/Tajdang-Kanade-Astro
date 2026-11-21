import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { parseFrontmatter } from "astro/markdown";
import { slug } from "github-slugger";
import { satteri } from "@astrojs/markdown-satteri";
import { relativePostLinks } from "../src/lib/relative-post-links";

for (const lang of ["en", "th"]) {
  const prefix = lang === "th" ? "/th" : "";
  test(`${lang}: Obsidian Markdown links navigate between internship and project in both directions`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/posts/bkbiet-internship/`);
    const advisory = page.locator("#article-body a", {
      hasText: /^advisory$/i,
    });
    await expect(advisory).toHaveAttribute("href", `${prefix}/posts/advisory/`);
    await advisory.click();
    await expect(page).toHaveURL(`${prefix}/posts/advisory/`);
    await expect(page.locator("article h1")).toHaveText(/Advisory/);
    await page.locator("#article-body a", { hasText: /BKBIET/ }).click();
    await expect(page).toHaveURL(`${prefix}/posts/bkbiet-internship/`);
    await expect(page.locator("article h1")).toHaveText(/BKBIET/);
  });
}

test("Every internal note link resolves as an Obsidian relative file path", () => {
  const root = resolve("src/content/posts");
  let checked = 0;
  for (const entry of readdirSync(root, { recursive: true })) {
    if (typeof entry !== "string" || !entry.endsWith(".md")) continue;
    const source = join(root, entry);
    for (const match of readFileSync(source, "utf8").matchAll(
      /\]\(([^)]+)\)/g,
    )) {
      const url = match[1];
      if (!url || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) continue;
      const path = decodeURIComponent(url.split(/[?#]/)[0] ?? "");
      expect(path, `${entry}: ${url}`).toMatch(/\.md$/);
      expect(
        existsSync(resolve(dirname(source), path)),
        `${entry}: ${url}`,
      ).toBe(true);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(0);
});

test("Markdown renderer resolves encoded files, headings, references, languages, and slugs", async () => {
  const root = mkdtempSync(join(tmpdir(), "kanade-links-"));
  function note(path: string, metadata: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      join(dirname(target), "post.json"),
      JSON.stringify({
        slug: slug(basename(dirname(target))),
        date: "2026-11-21",
        category: "projects",
        tags: [],
        cover: "notes",
        ...parseFrontmatter(`---\n${metadata}\n---`).frontmatter,
      }),
    );
    writeFileSync(
      target,
      "---\ntitle: Example\ndescription: Example note\n---\n## Hello World\n",
    );
    return target;
  }
  try {
    const source = note("blogs/source/en.md", "");
    note("projects/Hello โลก/th.md", "");
    note("projects/custom/en.md", "slug: custom-address");
    note("projects/nested/en.md", "");
    note("projects/draft/en.md", "draft: true");
    const renderer = await satteri({
      mdastPlugins: relativePostLinks({ postsDirectory: root }),
    }).createRenderer({ syntaxHighlight: false });
    const { code } = await renderer.render(
      [
        "[Thai](../../projects/Hello%20%E0%B9%82%E0%B8%A5%E0%B8%81/th.md?from=note#Hello%20World)",
        "[Custom][custom]",
        "[custom]: ../../projects/custom/en.md",
        "",
        "[Nested](../../projects/nested/en.md)",
        "[External](https://example.com/note.md)",
        "[Mail](mailto:hello@example.com)",
        "[Heading](#Hello%20World)",
        "[Site](/posts/advisory/)",
        "[File](../notes.pdf)",
        "`[Code](../missing.md)`",
      ].join("\n\n"),
      { fileURL: pathToFileURL(source) },
    );
    expect(code).toContain(
      'href="/th/posts/hello-%E0%B9%82%E0%B8%A5%E0%B8%81/?from=note#hello-world"',
    );
    expect(code).toContain('href="/posts/custom-address/"');
    expect(code).toContain('href="/posts/nested/"');
    for (const url of [
      "https://example.com/note.md",
      "mailto:hello@example.com",
      "#Hello%20World",
      "/posts/advisory/",
      "../notes.pdf",
    ])
      expect(code).toContain(`href="${url}"`);
    expect(code).toContain("[Code](../missing.md)");
    for (const url of [
      "../../projects/missing/en.md",
      "../../projects/draft/en.md",
      "../../../../outside.md",
    ]) {
      await expect(
        renderer.render(`[Bad](${url})`, { fileURL: pathToFileURL(source) }),
      ).rejects.toThrow(/Markdown link/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
