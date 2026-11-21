import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import {
  categoryNames,
  coverNames,
  normalizeCategory,
} from "./data/post-options";
import { languages } from "./i18n";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    date: z.coerce.date(),
    lang: z.enum(languages).default("en"),
    category: z.preprocess(
      (value) => (typeof value === "string" ? normalizeCategory(value) : value),
      z.enum(categoryNames),
    ),
    tags: z.array(
      z
        .string()
        .trim()
        .min(1)
        .regex(
          /^[^/]+(?:\/[^/]+)*$/,
          "Tag paths need a name at each level, for example Infrastructure/Kubernetes",
        )
        .transform((tag) =>
          tag
            .split("/")
            .map((part) => part.trim())
            .join("/"),
        ),
    ),
    cover: z.enum(coverNames),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});
export const collections = { posts };
