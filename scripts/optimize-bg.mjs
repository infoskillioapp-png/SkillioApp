import sharp from "sharp";
import { statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const dir = "public/landing";
const jobs = [
  { src: "fondo de landing 16_9 desktop.png", out: "hero-bg-desktop.webp", w: 1920 },
  { src: "fondo de landing 9_16 mobile.png", out: "hero-bg-mobile.webp", w: 1080 },
];

for (const j of jobs) {
  const src = join(dir, j.src);
  const out = join(dir, j.out);
  const before = statSync(src).size;
  await sharp(src).resize({ width: j.w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  const after = statSync(out).size;
  unlinkSync(src);
  console.log(`✅ ${j.out}  ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024).toFixed(0)}KB`);
}
