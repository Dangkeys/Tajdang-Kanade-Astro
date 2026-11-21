import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const input = resolve(process.argv[2] ?? "public/images/tajdang-avatar.png");
const output = resolve(process.argv[3] ?? "public/images/tajdang-avatar.svg");
const { width, height } = await sharp(input).metadata();
if (!width || !height)
  throw new Error("The source image needs a width and height.");
const temporary = mkdtempSync(join(tmpdir(), "tajdang-avatar-"));
try {
  const rgbFile = join(temporary, "palette.rgb");
  execFileSync("magick", [
    input,
    "-alpha",
    "off",
    "+dither",
    "-colors",
    "16",
    "-depth",
    "8",
    `RGB:${rgbFile}`,
  ]);
  const pixels = readFileSync(rgbFile);
  const colors = new Map();
  for (let i = 0; i < pixels.length; i += 3) {
    const key = pixels.readUIntBE(i, 3);
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }
  const layers = [];
  const stride = Math.ceil(width / 8);
  const dark = (color) => {
    const r = (color >> 16) & 255,
      g = (color >> 8) & 255,
      b = color & 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 70;
  };
  for (const [color] of [...colors].sort(
    (a, b) => Number(dark(a[0])) - Number(dark(b[0])) || b[1] - a[1],
  )) {
    const mask = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels.readUIntBE((y * width + x) * 3, 3) === color)
          mask[y * stride + (x >> 3)] |= 128 >> (x % 8);
      }
    }
    const bitmap = join(temporary, "mask.pbm");
    const traced = join(temporary, "layer.svg");
    writeFileSync(
      bitmap,
      Buffer.concat([Buffer.from(`P4\n${width} ${height}\n`), mask]),
    );
    const fill = "#" + color.toString(16).padStart(6, "0");
    execFileSync("potrace", [
      bitmap,
      "--svg",
      "--flat",
      "--turdsize",
      "4",
      "--opttolerance",
      "0.5",
      "--color",
      fill,
      "--output",
      traced,
    ]);
    const layer = readFileSync(traced, "utf8").match(/<g\b[\s\S]*<\/g>/)?.[0];
    if (layer)
      layers.push(
        layer.replace(
          'stroke="none"',
          `stroke="${fill}" stroke-width="7" stroke-linejoin="round"`,
        ),
      );
  }
  const background = [...colors]
    .sort((a, b) => b[1] - a[1])[0][0]
    .toString(16)
    .padStart(6, "0");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><title>Tajdang avatar</title><rect width="${width}" height="${height}" fill="#${background}"/>${layers.join("")}</svg>\n`;
  writeFileSync(output, svg);
  await sharp(Buffer.from(svg))
    .resize(400, 400)
    .png()
    .toFile(join(tmpdir(), "tajdang-avatar-vector-preview.png"));
  console.log(
    `Created ${output}: ${colors.size} vector color layers, ${Buffer.byteLength(svg)} bytes.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
