import { t } from "../i18n";
export const categoryNames = [
  "projects",
  "work-experience",
  "activities",
  "blogs",
] as const;
export type Category = (typeof categoryNames)[number];
export const categoryLabel = (category: string) =>
  categoryNames.includes(category as Category)
    ? t(`category.${category as Category}`)
    : category;
// Preserve links and frontmatter written before language-independent IDs.
export function normalizeCategory(value: string): string {
  return value;
}
export const coverNames = [
  "astro",
  "vue",
  "css",
  "notes",
  "life",
  "typescript",
  "git",
  "design",
] as const;
