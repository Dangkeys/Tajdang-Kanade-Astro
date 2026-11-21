import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseFrontmatter } from "astro/markdown";
import { z } from "astro/zod";
import { categoryNames, coverNames } from "../data/post-options";
import { postMediaSchema } from "./media";
import { postLinkSchema } from "./post-links";

const source = z
  .string()
  .trim()
  .regex(/^(\/(?!\/)|https?:\/\/)/, "Use a /local/path or an HTTP(S) URL");
const mediaId = z.string().trim().min(1);
const seriesSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z
      .object({
        en: z.string().trim().min(1),
        th: z.string().trim().min(1),
      })
      .strict(),
    episode: z.number().int().positive(),
  })
  .strict();
const sharedMediaSchema = z.discriminatedUnion("type", [
  z.object({ id: mediaId, type: z.literal("image"), src: source }).strict(),
  z
    .object({
      id: mediaId,
      type: z.literal("video"),
      src: source,
      poster: source.optional(),
    })
    .strict(),
  z.object({ id: mediaId, type: z.literal("youtube"), url: z.url() }).strict(),
  z.object({ id: mediaId, type: z.literal("embed"), src: z.url() }).strict(),
]);
const sharedPostSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .regex(
        /^[^?#\s]+$/,
        "Use a URL slug without spaces, a query, or a fragment",
      ),
    date: z.coerce.date(),
    category: z.enum(categoryNames),
    tags: z.array(
      z
        .string()
        .trim()
        .min(1)
        .regex(/^[^/]+(?:\/[^/]+)*$/, "Tag paths need a name at every level")
        .transform((tag) =>
          tag
            .split("/")
            .map((part) => part.trim())
            .join("/"),
        ),
    ),
    cover: z.enum(coverNames),
    coverImage: source.optional(),
    coverFit: z.enum(["cover", "contain"]).default("cover"),
    series: seriesSchema.pick({ episode: true }).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    media: z.array(sharedMediaSchema).default([]),
  })
  .strict();
const uniqueMediaPostSchema = sharedPostSchema.refine(
  (data) =>
    new Set(data.media.map((item) => item.id)).size === data.media.length,
  "Gallery media IDs must be unique",
);
const translatedText = z.string().trim().min(1);
const localizedPostSchema = z
  .object({
    title: translatedText,
    description: translatedText,
    mediaText: z
      .record(
        z.string(),
        z
          .object({
            alt: translatedText.optional(),
            title: translatedText.optional(),
            caption: z.string().optional(),
          })
          .strict(),
      )
      .default({}),
  })
  .strict();

export const postSchema = sharedPostSchema
  .omit({ media: true, series: true })
  .extend({
    series: seriesSchema.optional(),
    lang: z.enum(["en", "th"]),
    title: translatedText,
    description: translatedText,
    media: z.array(postMediaSchema),
    links: z.array(postLinkSchema).default([]),
  });

export function readPost(file: string) {
  const lang = z.enum(["en", "th"]).parse(basename(file, ".md"));
  const metadataFile = join(dirname(file), "post.json");
  const shared = uniqueMediaPostSchema.parse(
    JSON.parse(readFileSync(metadataFile, "utf8")),
  );
  const contents = readFileSync(file, "utf8");
  const parsed = parseFrontmatter(contents);
  const { mediaText, ...text } = localizedPostSchema.parse(parsed.frontmatter);
  const series = shared.series
    ? {
        ...seriesSchema
          .omit({ episode: true })
          .parse(
            JSON.parse(
              readFileSync(join(dirname(file), "..", "series.json"), "utf8"),
            ),
          ),
        ...shared.series,
      }
    : undefined;
  const data = {
    ...shared,
    ...text,
    series,
    lang,
    media: shared.media.map(({ id, ...asset }) => ({
      ...asset,
      ...mediaText[id],
    })),
  };
  return { id: `${lang}/${shared.slug}`, data, body: parsed.content };
}
