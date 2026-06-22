import sharp from "sharp";
import { readdirSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join } from "node:path";

const dir = "public/landing/testimonios";

// Mapa: nombre subido → slug que espera el código
const map = [
  { match: /^sofi/i, out: "sofi.jpg" },
  { match: /^mati/i, out: "mati.jpg" },
  { match: /^luchi/i, out: "luchi.jpg" },
  { match: /^juli/i, out: "juli.jpg" },
  { match: /^fran/i, out: "fran.jpg" },
  { match: /^cami/i, out: "cami.jpg" },
];

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

for (const f of files) {
  const target = map.find((m) => m.match.test(f));
  if (!target) {
    console.log("⏭  sin mapeo, ignoro:", f);
    continue;
  }
  const src = join(dir, f);
  const tmp = join(dir, "_tmp_" + target.out);
  const before = statSync(src).size;

  await sharp(src)
    .resize(256, 256, { fit: "cover", position: "attention" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(tmp);

  // Borro el original y dejo el optimizado con el nombre final
  unlinkSync(src);
  // Si ya existía un destino igual (mismo nombre), se sobreescribe
  try { unlinkSync(join(dir, target.out)); } catch {}
  renameSync(tmp, join(dir, target.out));

  const after = statSync(join(dir, target.out)).size;
  console.log(`✅ ${f}  →  ${target.out}   ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024).toFixed(0)}KB`);
}

console.log("\nArchivos finales:", readdirSync(dir).join(", "));
