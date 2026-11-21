import { test, expect } from "@playwright/test";

for (const language of ["en", "th"]) {
  test(`${language}: the visible theme button changes colors and keeps the choice across navigation and reload`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(
      language === "th" ? "/th/posts/about-me/" : "/posts/about-me/",
    );
    const root = page.locator("html");
    const button = page.locator(".theme-control");
    const original = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect(root).not.toHaveClass(/dark/);
    await button.click();
    await expect(root).toHaveClass(/dark/);
    await expect(page.locator("body")).not.toHaveCSS(
      "background-color",
      original,
    );
    await page.locator(".language-control").click();
    await expect(root).toHaveClass(/dark/);
    await page.locator(".theme-control").click();
    await expect(root).not.toHaveClass(/dark/);
    await page.reload();
    await expect(root).not.toHaveClass(/dark/);
    await page.locator(".theme-control").click();
    await expect(root).toHaveClass(/dark/);
  });
}
