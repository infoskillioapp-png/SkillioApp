import { execFileSync } from "node:child_process";
import { statSync, renameSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const input = "public/landing/hero.mp4";
const tmp = "public/landing/_hero-opt.mp4";
const before = statSync(input).size;

// Hero = primera impresión → 1080p, alta calidad (CRF 23), faststart, sin audio.
execFileSync(
  ffmpegPath,
  [
    "-y",
    "-i", input,
    "-vf", "scale='min(1920,iw)':-2",
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "slow",
    "-pix_fmt", "yuv420p",
    "-an",
    "-movflags", "+faststart",
    tmp,
  ],
  { stdio: "inherit" },
);

renameSync(tmp, input);
const after = statSync(input).size;
console.log(`\n✅ hero.mp4  ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(2)}MB`);
