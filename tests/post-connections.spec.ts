import { test, expect, type Page } from "@playwright/test";
import { satteri } from "@astrojs/markdown-satteri";
import { extractPostLinks, getPostConnections } from "../src/lib/post-links";

async function backlinksPanel(page: Page) {
  const menu = page.locator(".mobile-article-nav");
  if (await menu.isVisible()) await menu.locator("summary").click();
  return page.locator(".article-toc [data-post-backlinks]:visible");
}

test("connections use rendered links, including references and HTML, without treating images or code as links", async () => {
  const renderer = await satteri().createRenderer({ syntaxHighlight: false });
  const { code } = await renderer.render(
    [
      "[A **post**](/posts/advisory/)",
      "[A reference][project]",
      "[project]: /posts/homelab/",
      "[unused]: /posts/not-linked/",
      '<a href="/th/posts/my-timeline/">Timeline</a>',
      "![An image](/images/avatar.png)",
      "`[Example](/posts/not-linked/)`",
      "<!-- <a href='/posts/not-linked/'>Comment</a> -->",
    ].join("\n\n"),
  );
  expect(extractPostLinks(code)).toEqual([
    { href: "/posts/advisory/", label: "A post" },
    { href: "/posts/homelab/", label: "A reference" },
    { href: "/th/posts/my-timeline/", label: "Timeline" },
  ]);
  const next = await renderer.render("No links here.");
  expect(extractPostLinks(next.code)).toEqual([]);
});

test("backlinks resolve languages, encoded paths, queries and headings, and exclude drafts, self links and duplicates", () => {
  type Post = Parameters<typeof getPostConnections>[0]["post"];
  function post(
    id: string,
    links: string[],
    lang: "en" | "th" = "en",
    draft = false,
  ): Post {
    return {
      id,
      data: {
        title: id,
        description: `Description for ${id}`,
        lang,
        draft,
        links: links.map((href) => ({ href, label: href })),
      },
    };
  }
  const target = post(
    "th/โลก",
    [
      "/posts/source/",
      "/posts/source/#heading",
      "/th/posts/%E0%B9%82%E0%B8%A5%E0%B8%81/",
      "#heading",
      "https://example.org/resource",
      "https://example.org/resource",
      "mailto:hello@example.org",
      "javascript:alert(1)",
      "/posts/draft/",
      "/a-malformed-percent%/",
    ],
    "th",
  );
  const source = post("en/source", [
    "/th/posts/%E0%B9%82%E0%B8%A5%E0%B8%81/?from=note#heading",
    "https://site.example/th/posts/โลก/",
  ]);
  const draft = post("en/draft", ["/th/posts/โลก/"], "en", true);
  const connections = getPostConnections({
    post: target,
    posts: [target, source, draft],
    site: new URL("https://site.example"),
  });
  expect(connections.backlinks.map((link) => link.href)).toEqual([
    "/posts/source/",
  ]);
  expect(connections.outgoing.map((link) => link.href)).toEqual([
    "/posts/source/",
    "https://example.org/resource",
    "mailto:hello@example.org",
    "/a-malformed-percent%/",
  ]);
});

for (const lang of ["en", "th"]) {
  const prefix = lang === "th" ? "/th" : "";
  test(`${lang}: follow a post's outgoing link and navigate back through its backlink`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/posts/bkbiet-internship/`);
    const outgoing = page.locator("#outgoing-links");
    await expect(outgoing.getByRole("link")).toHaveCount(1);
    await outgoing.getByRole("link", { name: /Advisory/ }).click();
    await expect(page).toHaveURL(`${prefix}/posts/advisory/`);
    await expect(page.locator("article [data-post-backlinks]")).toHaveCount(0);
    const backlink = (await backlinksPanel(page)).getByRole("link", {
      name: /BKBIET/,
    });
    await expect(backlink).toBeVisible();
    await backlink.click();
    await expect(page).toHaveURL(`${prefix}/posts/bkbiet-internship/`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("outgoing external links and the empty backlinks state are visible", async ({
  page,
}) => {
  await page.goto("/posts/this-portfolio/");
  await expect(page.locator("#outgoing-links a")).toHaveCount(2);
  await expect(
    page
      .locator("#outgoing-links")
      .getByRole("link", { name: /My repository/ }),
  ).toHaveAttribute("href", "https://github.com/Dangkeys/Tajdang-Kanade-Astro");
  await expect(await backlinksPanel(page)).toContainText(
    "No other posts link here yet.",
  );
});
