import { execFileSync } from "node:child_process";
import { statSync, renameSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const dir = "public/landing";
const input = `${dir}/antes-despues.mp4`;
const tmp = `${dir}/_antes-despues-opt.mp4`;

const before = statSync(input).size;

// Screen-recording → comprime muy bien. 720p, CRF 28, sin audio, faststart (streaming).
execFileSync(
  ffmpegPath,
  [
    "-y",
    "-i", input,
    "-vf", "scale=1280:-2",
    "-c:v", "libx264",
    "-crf", "28",
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
console.log(`\n✅ antes-despues.mp4  ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(2)}MB`);
