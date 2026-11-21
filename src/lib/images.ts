import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

const images = import.meta.glob<{ default: ImageMetadata }>(
  "/public/images/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

export async function optimizedImageUrl(
  path: string,
  width: number,
): Promise<string> {
  const image = images[`/public${path}`]?.default;
  if (!image) return path;
  const result = await getImage({
    src: image,
    width: Math.min(width, image.width),
    format: "webp",
    quality: 85,
  });
  return result.src;
}
