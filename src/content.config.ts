import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import {
  categoryNames,
  coverNames,
  normalizeCategory,
} from "./data/post-options";
import { postMediaSchema } from "./lib/media";
import { languages } from "./i18n";

import { getPostEntryId } from "./lib/post-paths";

const posts = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/posts",
    generateId: ({ entry, data }) => getPostEntryId({ entry, slug: data.slug }),
  }),
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
    coverImage: z
      .string()
      .trim()
      .regex(/^(\/(?!\/)|https?:\/\/)/, "Use a /local/path or an HTTP(S) URL")
      .optional(),
    media: z.array(postMediaSchema).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});
export const collections = { posts };
