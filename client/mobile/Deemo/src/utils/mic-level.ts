// Mic check math: float PCM (-1..1) -> 0..1 meter level, and speech vs. room noise.
// ponytail: fixed dB window and margins; calibrate on the lowest-end test phone.
export const FLOOR_DB = -60;
export const CEIL_DB = -10;
export const MIN_SPEECH_LEVEL = 0.35; // ≈ -42 dBFS; quieter than this never counts
export const SPEECH_MARGIN = 0.15; // ≈ 7.5 dB above the room's steady noise

export function levelOf(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  if (rms === 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.min(1, Math.max(0, (db - FLOOR_DB) / (CEIL_DB - FLOOR_DB)));
}

// Noise floor: drops to any quieter reading at once, creeps up slowly, so steady
// hum/fans (and phone AGC) become the floor while speech stands out above it.
export function nextFloor(floor: number, level: number): number {
  return level < floor ? level : floor + (level - floor) * 0.02;
}

export function isSpeech(level: number, floor: number): boolean {
  return level > Math.max(MIN_SPEECH_LEVEL, floor + SPEECH_MARGIN);
}
