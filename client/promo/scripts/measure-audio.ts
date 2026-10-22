// Measures how loud each generated audio file is (the RMS of its active part, in dB) and records it in
// src/audio.json `levels`, so the mix can set every sound relative to the voiceover instead of guessing volumes
// (ElevenLabs returns effects anywhere from -11 to -38 dB). Runs after `bun run audio`, or alone: `bun run levels`.
// Uses Remotion's bundled ffmpeg to decode to 16 kHz mono WAV.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = "public/audio";

function loudness(file: string, tmp: string): number {
  const wav = join(tmp, "x.wav");
  const r = Bun.spawnSync(["bunx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", file, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  if (r.exitCode !== 0) throw new Error(`ffmpeg failed on ${file}: ${r.stderr.toString()}`);
  const buf = readFileSync(wav);
  const samples = new Int16Array(buf.buffer, buf.byteOffset + 44, Math.floor((buf.length - 44) / 2));
  // 0.1 s windows; only the ones above about -50 dB count, so silence around a short effect doesn't drag it down.
  const win = 1600;
  const levels: number[] = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += samples[j]! * samples[j]!;
    levels.push(Math.sqrt(sum / win) / 32768);
  }
  const active = levels.filter((l) => l > 0.003);
  const pool = active.length ? active : levels;
  const rms = Math.sqrt(pool.reduce((s, l) => s + l * l, 0) / Math.max(1, pool.length));
  return Math.round(20 * Math.log10(rms + 1e-9) * 10) / 10;
}

export function measureAudio() {
  const tmp = mkdtempSync(join(tmpdir(), "promo-levels-"));
  const levels: Record<string, number> = {};
  try {
    for (const f of readdirSync(DIR).filter((n) => n.endsWith(".mp3")).sort()) levels[f.replace(/\.mp3$/, "")] = loudness(join(DIR, f), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const manifest = JSON.parse(readFileSync("src/audio.json", "utf8"));
  writeFileSync("src/audio.json", JSON.stringify({ ...manifest, levels }, null, 2) + "\n");
  console.log("levels:", levels);
}

if (import.meta.main) measureAudio();
