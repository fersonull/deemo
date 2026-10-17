// Generates the promo's voiceover, sound effects and music bed with ElevenLabs, into public/audio/, and writes
// src/audio.json (each line's spoken length) so every scene is sized to its voiceover.
//   bun run audio            # everything missing
//   bun run audio --force    # regenerate all
// Needs ELEVENLABS_API_KEY in .env (Bun loads it). VOICE_ID overrides the default voice.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { LINES, SFX, MUSIC } from "../src/script";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY in client/promo/.env");
const VOICE = process.env.VOICE_ID ?? "cgSgspJ2msm6clMCkdW9"; // Jessica: young, warm, upbeat
const force = process.argv.includes("--force");
const API = "https://api.elevenlabs.io/v1";
const OUT = "public/audio";
mkdirSync(OUT, { recursive: true });

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "xi-api-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res;
}

const manifest: { voice: Record<string, number>; sfx: string[]; music: boolean } = { voice: {}, sfx: [], music: false };
const old = existsSync("src/audio.json") ? (await Bun.file("src/audio.json").json()) as typeof manifest : null;

for (const [id, text] of Object.entries(LINES)) {
  const file = `${OUT}/vo-${id}.mp3`;
  if (!force && existsSync(file) && old?.voice[id]) {
    manifest.voice[id] = old.voice[id];
    continue;
  }
  const res = await post(`/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
  });
  const { audio_base64, alignment } = (await res.json()) as {
    audio_base64: string;
    alignment: { character_end_times_seconds: number[] };
  };
  writeFileSync(file, Buffer.from(audio_base64, "base64"));
  manifest.voice[id] = alignment.character_end_times_seconds.at(-1)!;
  console.log(`vo  ${id}  ${manifest.voice[id]!.toFixed(2)}s`);
}

for (const [id, { prompt, seconds }] of Object.entries(SFX)) {
  const file = `${OUT}/sfx-${id}.mp3`;
  if (force || !existsSync(file)) {
    const res = await post("/sound-generation", { text: prompt, duration_seconds: seconds, prompt_influence: 0.6 });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`sfx ${id}`);
  }
  manifest.sfx.push(id);
}

// The Music API is paid-plan only; on a free plan fall back to a 30 s looping bed from the sound-effects model
// (the promo loops it). Without either, the promo plays with voice and effects only.
const musicFile = `${OUT}/music.mp3`;
try {
  if (force || !existsSync(musicFile)) {
    let res: Response;
    try {
      res = await post("/music", { prompt: MUSIC.prompt, music_length_ms: MUSIC.seconds * 1000 });
    } catch {
      res = await post("/sound-generation", { text: `${MUSIC.prompt} Seamless loop.`, duration_seconds: 30, loop: true, prompt_influence: 0.5 });
    }
    writeFileSync(musicFile, Buffer.from(await res.arrayBuffer()));
    console.log("music");
  }
  manifest.music = true;
} catch (e) {
  console.warn(`music skipped: ${(e as Error).message.slice(0, 200)}`);
}

writeFileSync("src/audio.json", JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote src/audio.json");
