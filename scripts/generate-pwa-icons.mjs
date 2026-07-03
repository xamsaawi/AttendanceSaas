// Generates placeholder PWA icons. Replace with real branded assets before launch,
// then re-run: node scripts/generate-pwa-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");
const BG = "#0a0a0a";
const FG = "#ffffff";

function svgIcon(size) {
  const fontSize = Math.round(size * 0.42);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${BG}" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${FG}">A</text>
    </svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "maskable-icon-512.png", size: 512 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const { name, size } of targets) {
  const buffer = await sharp(Buffer.from(svgIcon(size))).png().toBuffer();
  await writeFile(path.join(OUT_DIR, name), buffer);
  console.log(`Generated ${name}`);
}
