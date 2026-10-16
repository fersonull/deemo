// How open the speaking panelist's mouth is, from the loudness of the voice the phone is playing.
// RMS of one analyser frame (0..~0.5 for speech) -> 0..1, with a noise floor so breaths and room tone keep it shut,
// a fast attack so syllables open it at once, and a slower release so it doesn't flutter between them.

export const VOICE_FLOOR = 0.012; // below this RMS the mouth is closed
const FULL = 0.16; // RMS that opens it all the way
const ATTACK = 0.65; // share of the gap closed per frame when getting louder
const RELEASE = 0.28; // ... when getting quieter

export function voiceTarget(rms: number) {
  if (!Number.isFinite(rms) || rms <= VOICE_FLOOR) return 0;
  return Math.min(1, (rms - VOICE_FLOOR) / (FULL - VOICE_FLOOR));
}

export function envelope(previous: number, rms: number) {
  const target = voiceTarget(rms);
  const next = previous + (target - previous) * (target > previous ? ATTACK : RELEASE);
  return next < 0.01 ? 0 : Math.min(1, next);
}

// Root mean square of one frame of samples.
export function rms(samples: Float32Array) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}
