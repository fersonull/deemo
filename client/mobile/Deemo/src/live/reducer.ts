import type { AskQuestion, Line, LiveEvent, LiveState } from "./types";

export const FOLLOW_UP_LIMIT = 2; // Bounded Adaptive Follow-Up default (plan F8); setup can change it

export const initialLiveState: LiveState = {
  phase: "connecting",
  paused: false,
  reconnecting: false,
  question: null,
  lines: [],
  partial: null,
  sessionMs: 0,
  durationLimitMs: 10 * 60_000,
  endedBy: "panel",
  responseMs: 0,
  firstSpeechMs: null,
  flags: [],
  turns: [],
  followUps: {},
  followUpLimit: FOLLOW_UP_LIMIT,
  level: 0,
  seat: 0,
  takeover: false,
};

// The client-side tool handler's rule: the AI can't exceed the follow-up limit even if it tries.
export function canAsk(state: LiveState, q: AskQuestion): boolean {
  return (
    !state.error && state.phase !== "ending" && state.phase !== "ended" &&
    (!q.isFollowUp || (state.followUps[q.topicId] ?? 0) < state.followUpLimit)
  );
}

function finish(s: LiveState): Line[] {
  return s.partial && s.partial.text.trim() ? [...s.lines, { ...s.partial, text: s.partial.text.trim() }] : s.lines;
}

// Adds a transcription chunk; a different speaker's unfinished line is closed first, never dropped.
// A new sentence that arrives as its own chunk ("testing?" + "Okay.") gets a space, not "testing?Okay.".
function append(s: LiveState, who: Line["who"], text: string): Pick<LiveState, "lines" | "partial"> {
  if (s.partial?.who === who) {
    const gap = /[.?!,;:]$/.test(s.partial.text) && /^[^\s.,?!]/.test(text) ? " " : "";
    return { lines: s.lines, partial: { ...s.partial, text: s.partial.text + gap + text } };
  }
  return { lines: finish(s), partial: { who, text } };
}

export function liveReducer(s: LiveState, e: LiveEvent): LiveState {
  switch (e.type) {
    case "connected":
      return { ...s, phase: "presentation" };

    case "ask": {
      // The panel spoke first this turn (a guessed follow-up, labeled with the last asker). The tool call says who
      // really asked: undo the guess and keep that speech as this question's line, under the right name.
      if (s.unasked) {
        const base = { ...s, question: s.unasked.question, followUps: s.unasked.followUps, unasked: undefined };
        if (!canAsk(base, e.question)) return { ...s, unasked: undefined };
        const asked = liveReducer({ ...base, partial: null }, e);
        const partial = s.partial && s.partial.who !== "you" ? { ...s.partial, who: e.question.panelist } : s.partial;
        return { ...asked, lines: s.lines, partial };
      }
      if (!canAsk(s, e.question)) return s;
      const q = e.question;
      const fresh = s.takeover ? { takeover: false } : {};
      const followUp = q.isFollowUp ? (s.followUps[q.topicId] ?? 0) + 1 : 0;
      const number = q.isFollowUp && s.question ? s.question.number : (s.question?.number ?? 0) + 1;
      return {
        ...s,
        phase: "speaking",
        question: { ...q, followUp, number },
        followUps: q.isFollowUp ? { ...s.followUps, [q.topicId]: followUp } : s.followUps,
        lines: finish(s),
        partial: null,
        ...fresh,
      };
    }

    case "panelText": {
      // Whoever holds the floor: the asker, or the panelist who just took over or is closing.
      const who = s.takeover || s.phase === "ending" ? s.seat : (s.question?.panelist ?? s.seat);
      if (s.phase !== "thinking") return { ...s, ...append(s, who, e.text) };
      // A new panelist introducing themselves before their first ask_question: theirs, not a follow-up.
      if (s.takeover) return { ...s, ...append(s, who, e.text), phase: "speaking" };
      // The panel spoke without ask_question (a rephrase or challenge, seen after reconnects).
      // Count it as a follow-up on the current topic so the limit still holds for the next tool call.
      const q = s.question;
      if (!q) return { ...s, ...append(s, who, e.text), phase: "speaking" };
      // At the limit already, it can't be a follow-up (a handover line, a closing remark): keep the question as it is.
      // It's still marked unasked, so a tool call that follows can relabel it.
      const prev = s.followUps[q.topicId] ?? 0;
      if (prev >= s.followUpLimit)
        return { ...s, ...append(s, who, e.text), phase: "speaking", unasked: { question: s.question, followUps: s.followUps } };
      const followUp = prev + 1;
      return {
        ...s,
        ...append(s, who, e.text),
        phase: "speaking",
        question: { ...q, isFollowUp: true, followUp },
        followUps: { ...s.followUps, [q.topicId]: followUp },
        unasked: { question: s.question, followUps: s.followUps },
      };
    }

    case "handover":
      return { ...s, seat: e.seat, takeover: true, phase: "thinking", lines: finish(s), partial: null, unasked: undefined };

    case "panelDone": {
      if (s.phase === "ending") return { ...s, lines: finish(s), partial: null, unasked: undefined };
      const phase = s.question ? "listening" : "presentation"; // no question yet: the panel let the presentation run on
      return { ...s, phase, lines: finish(s), partial: null, responseMs: 0, firstSpeechMs: null, unasked: undefined };
    }

    case "youText": {
      // Gemini transcribes a manual turn only after the student taps done, so text can land while "thinking".
      if (s.phase === "thinking" || (s.phase === "ending" && s.endedBy === "time")) {
        const last = s.turns.at(-1);
        const turns =
          last && last.question === s.question
            ? [...s.turns.slice(0, -1), { ...last, answer: (last.answer + e.text).trim() }]
            : s.turns;
        return { ...s, ...append(s, "you", e.text), turns };
      }
      if (s.phase !== "listening" && s.phase !== "presentation") return s;
      const first = s.phase === "listening" && s.firstSpeechMs === null ? s.responseMs : s.firstSpeechMs;
      return { ...s, ...append(s, "you", e.text), firstSpeechMs: first };
    }

    case "youSpeaking": // mic heard speech: the latency mark when transcription comes later
      return s.phase === "listening" && s.firstSpeechMs === null ? { ...s, firstSpeechMs: s.responseMs } : s;

    case "youDone": {
      if (s.phase !== "listening" && s.phase !== "presentation") return s;
      const answer = s.partial?.who === "you" ? s.partial.text.trim() : "";
      const turns =
        s.phase === "listening" && s.question
          ? [
              ...s.turns,
              {
                question: s.question,
                latencyMs: s.firstSpeechMs,
                answerMs: s.responseMs - (s.firstSpeechMs ?? s.responseMs),
                answer,
              },
            ]
          : s.turns;
      return { ...s, phase: "thinking", lines: finish(s), partial: null, turns };
    }

    case "flag": {
      const flag = { ...e.flag, atMs: s.sessionMs };
      if (s.partial?.who === "you") return { ...s, flags: [...s.flags, flag], partial: { ...s.partial, flagged: true } };
      const i = s.lines.map((l) => l.who).lastIndexOf("you");
      const lines = i < 0 ? s.lines : s.lines.map((l, k) => (k === i ? { ...l, flagged: true } : l));
      return { ...s, flags: [...s.flags, flag], lines };
    }

    case "end":
      return { ...s, phase: "ending", endedBy: e.reason ?? s.endedBy, lines: finish(s), partial: null };

    case "error":
      return { ...s, error: e.message, reconnecting: false, paused: false, level: 0 };

    case "ended":
      return { ...s, phase: "ended" };

    case "tick": {
      if (s.error || s.paused || s.reconnecting || s.phase === "connecting" || s.phase === "ending" || s.phase === "ended") return s;
      const ms = Math.min(e.ms, s.durationLimitMs - s.sessionMs);
      const next = {
        ...s,
        sessionMs: s.sessionMs + ms,
        responseMs: s.phase === "listening" ? s.responseMs + ms : s.responseMs,
      };
      if (next.sessionMs < s.durationLimitMs) return next;
      const finished = liveReducer(next, { type: "youDone" });
      return liveReducer(finished, { type: "end", reason: "time" });
    }

    case "level":
      return { ...s, level: e.value };

    case "pause":
      return { ...s, paused: true, level: 0 };
    case "resume":
      return { ...s, paused: false };
    case "reconnecting":
      return { ...s, reconnecting: e.value };
  }
}
