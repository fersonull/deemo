import { isSpeech, levelOf, nextFloor } from "./mic-level";

// Noise gate for the live mic stream: chunks that aren't clearly the student's voice go out as silence,
// so steady noise and quieter voices further from the phone never reach Gemini.
// Output runs one chunk behind the input, so the chunk before a word is kept too (soft first syllables).
// ponytail: level-based, not ML; noise mixed into speech still passes, and a loud noise that starts
// mid-session passes like speech. Platform noise suppression (VoiceCommunication input preset) is the
// upgrade, and it needs a native rebuild.

export const HOLD_CHUNKS = 6; // keep ~600 ms after speech so pauses and word tails aren't clipped
const START_FLOOR = 0.25; // ≈ -47 dBFS, when the mic check didn't measure the room

let roomFloor: number | null = null;

// The mic check measures the room seconds before the session; the gate starts from that.
export function rememberRoomFloor(floor: number) {
  roomFloor = floor;
}

export function createNoiseGate() {
  let floor = roomFloor ?? START_FLOOR;
  let hold = 0;
  let pending: { samples: Float32Array; open: boolean } | null = null;

  const emit = (p: NonNullable<typeof pending>, open: boolean) =>
    p.open || open ? p.samples : new Float32Array(p.samples.length);

  return {
    // Returns the level and speech flag for this chunk, and the (delayed) chunk to send, if any.
    push(samples: Float32Array) {
      const level = levelOf(samples);
      const speech = isSpeech(level, floor);
      // The floor tracks the room only between words; rising during a long answer would gate the voice itself.
      if (!speech) floor = nextFloor(floor, level);
      const open = speech || hold > 0;
      hold = speech ? HOLD_CHUNKS : Math.max(0, hold - 1);
      const out = pending ? emit(pending, open) : null;
      pending = { samples: samples.slice(), open }; // the recorder may reuse its buffer for the next chunk
      return { level, speech, out };
    },
    // End of the turn: the last held-back chunk, then a clean start for the next turn (the floor stays).
    flush() {
      const out = pending ? emit(pending, false) : null;
      pending = null;
      hold = 0;
      return out;
    },
  };
}
