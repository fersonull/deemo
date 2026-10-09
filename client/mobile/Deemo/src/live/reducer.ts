import type { AskQuestion, Line, LiveEvent, LiveState } from "./types";

export const FOLLOW_UP_LIMIT = 2; // Bounded Adaptive Follow-Up default (plan F8)

export const initialLiveState: LiveState = {
  phase: "connecting",
  paused: false,
  reconnecting: false,
  question: null,
  lines: [],
  partial: null,
  sessionMs: 0,
  responseMs: 0,
  firstSpeechMs: null,
  flags: [],
  turns: [],
  followUps: {},
  level: 0,
};

// The client-side tool handler's rule: the AI can't exceed the follow-up limit even if it tries.
export function canAsk(state: LiveState, q: AskQuestion, limit = FOLLOW_UP_LIMIT): boolean {
  return !q.isFollowUp || (state.followUps[q.topicId] ?? 0) < limit;
}

function append(partial: Line | null, who: Line["who"], text: string): Line {
  return partial && partial.who === who ? { ...partial, text: partial.text + text } : { who, text };
}

function finish(s: LiveState): Line[] {
  return s.partial && s.partial.text.trim() ? [...s.lines, { ...s.partial, text: s.partial.text.trim() }] : s.lines;
}

export function liveReducer(s: LiveState, e: LiveEvent): LiveState {
  switch (e.type) {
    case "connected":
      return { ...s, phase: "presentation" };

    case "ask": {
      if (!canAsk(s, e.question)) return s;
      const q = e.question;
      const followUp = q.isFollowUp ? (s.followUps[q.topicId] ?? 0) + 1 : 0;
      const number = q.isFollowUp && s.question ? s.question.number : (s.question?.number ?? 0) + 1;
      return {
        ...s,
        phase: "speaking",
        question: { ...q, followUp, number },
        followUps: q.isFollowUp ? { ...s.followUps, [q.topicId]: followUp } : s.followUps,
        lines: finish(s),
        partial: null,
      };
    }

    case "panelText":
      return { ...s, partial: append(s.partial, s.phase === "ending" ? 0 : (s.question?.panelist ?? 0), e.text) };

    case "panelDone":
      return s.phase === "ending"
        ? { ...s, lines: finish(s), partial: null }
        : { ...s, phase: "listening", lines: finish(s), partial: null, responseMs: 0, firstSpeechMs: null };

    case "youText": {
      if (s.phase !== "listening" && s.phase !== "presentation") return s;
      const first = s.phase === "listening" && s.firstSpeechMs === null ? s.responseMs : s.firstSpeechMs;
      return { ...s, partial: append(s.partial, "you", e.text), firstSpeechMs: first };
    }

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
      return { ...s, phase: "ending", lines: finish(s), partial: null };

    case "ended":
      return { ...s, phase: "ended" };

    case "tick": {
      if (s.paused || s.reconnecting || s.phase === "connecting" || s.phase === "ended") return s;
      return {
        ...s,
        sessionMs: s.sessionMs + e.ms,
        responseMs: s.phase === "listening" ? s.responseMs + e.ms : s.responseMs,
      };
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
