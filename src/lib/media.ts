import { z } from "astro/zod";

const mediaSource = z
  .string()
  .trim()
  .regex(/^(\/(?!\/)|https?:\/\/)/, "Use a /local/path or an HTTP(S) URL");
function youtubeEmbed(value: string): string | undefined {
  const url = new URL(value);
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (/^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ??
          null);
  }
  return id && /^[\w-]{11}$/.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : undefined;
}
const caption = z.string().optional();
export const postMediaSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    src: mediaSource,
    alt: z.string().min(1),
    caption,
  }),
  z.object({
    type: z.literal("video"),
    src: mediaSource,
    title: z.string().min(1),
    poster: mediaSource.optional(),
    caption,
  }),
  z.object({
    type: z.literal("youtube"),
    url: z.url().transform((value, ctx) => {
      const embed = youtubeEmbed(value);
      if (!embed) {
        ctx.addIssue({
          code: "custom",
          message:
            "Use a valid YouTube watch, share, shorts, live, or embed URL",
        });
        return z.NEVER;
      }
      return embed;
    }),
    title: z.string().min(1),
    caption,
  }),
  z.object({
    type: z.literal("embed"),
    src: z
      .url()
      .refine(
        (value) => ["https:", "http:"].includes(new URL(value).protocol),
        "Use an HTTP(S) embed URL",
      ),
    title: z.string().min(1),
    caption,
  }),
]);
export type PostMedia = z.infer<typeof postMediaSchema>;
