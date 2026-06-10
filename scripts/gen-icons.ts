/**
 * Renders design-spike/icon.html (the "lx." mark) into the favicon and PWA
 * icon assets. Playwright is already a devDependency; no image libs needed —
 * ICO files may embed PNG data directly.
 *
 *   npx tsx scripts/gen-icons.ts
 *
 * Writes app/favicon.ico (16/32/48/256) and refreshes public/icons/*.png.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = pathToFileURL(path.join(ROOT, "design-spike", "icon.html")).href;

const FAVICON_SIZES = [16, 32, 48, 256];

async function shoot(page: Page, size: number, maskable = false): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  await page.goto(maskable ? `${SOURCE}#maskable` : SOURCE);
  // Google-Fonts Archivo must be in before the screenshot
  await page.evaluate(() => document.fonts.ready);
  await page.reload(); // re-applies the #maskable hash script after goto changes
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: "png" });
  return toRgba(page, shot);
}

/**
 * Re-encode through a canvas: Playwright emits RGB-only PNGs for opaque
 * captures, and Turbopack's ICO decoder requires RGBA frames.
 */
async function toRgba(page: Page, png: Buffer): Promise<Buffer> {
  const dataUrl = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  }, `data:image/png;base64,${png.toString("base64")}`);
  const out = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  // PNG IHDR colour type lives at byte 25; 6 = truecolour with alpha
  if (out[25] !== 6) throw new Error(`expected RGBA png, got colour type ${out[25]}`);
  return out;
}

/** Minimal ICO container around PNG-encoded images (supported since Vista). */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const favicons: { size: number; png: Buffer }[] = [];
  for (const size of FAVICON_SIZES) {
    favicons.push({ size, png: await shoot(page, size) });
    console.log(`rendered ${size}x${size}`);
  }
  await writeFile(path.join(ROOT, "app", "favicon.ico"), buildIco(favicons));
  console.log("wrote app/favicon.ico");

  const iconsDir = path.join(ROOT, "public", "icons");
  await mkdir(iconsDir, { recursive: true });
  await writeFile(path.join(iconsDir, "icon-192.png"), await shoot(page, 192));
  await writeFile(path.join(iconsDir, "icon-512.png"), await shoot(page, 512));
  await writeFile(
    path.join(iconsDir, "icon-512-maskable.png"),
    await shoot(page, 512, true),
  );
  console.log("wrote public/icons/icon-{192,512,512-maskable}.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
