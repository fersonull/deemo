// Live session model. Events mirror what the Gemini Live API delivers (addendum B4/B5):
// transcription chunks, turn completion, and the ask_question / flag_inconsistency /
// end_session tool calls. The mock engine and the real Live engine both emit these.

export type QuestionType = "TECHNICAL" | "METHODOLOGICAL" | "CONCEPTUAL" | "CLARIFICATORY";

export type Phase = "connecting" | "presentation" | "speaking" | "listening" | "thinking" | "ending" | "ended";

export type Question = {
  topicId: string;
  text: string;
  type: QuestionType;
  isFollowUp: boolean;
  panelist: number; // index into the panel
  followUp: number; // 0 for a main question, 1..limit for follow-ups
  number: number; // main question number, 1-based
};

export type Line = {
  who: "you" | number; // panelist index otherwise
  text: string;
  flagged?: boolean;
};

export type Inconsistency = {
  spokenClaim: string;
  manuscriptEvidence: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  atMs: number;
};

// Response Duration Tracking (plan F12): per answered question.
export type Turn = { question: Question; latencyMs: number | null; answerMs: number; answer: string };

export type LiveState = {
  phase: Phase;
  paused: boolean;
  reconnecting: boolean;
  question: Question | null;
  lines: Line[]; // finished transcript lines
  partial: Line | null; // the line still streaming in
  sessionMs: number; // excludes paused and reconnecting time
  responseMs: number; // current answer, since the panel finished asking
  firstSpeechMs: number | null; // responseMs when the student started talking
  flags: Inconsistency[];
  turns: Turn[];
  followUps: Record<string, number>;
  followUpLimit: number; // per topic, chosen in setup (plan F8)
  level: number; // 0..1 mic level for the mic ring
};

export type AskQuestion = Omit<Question, "followUp" | "number">;

export type LiveEvent =
  | { type: "connected" }
  | { type: "ask"; question: AskQuestion } // ask_question tool call
  | { type: "panelText"; text: string } // output transcription chunk
  | { type: "panelDone" } // panel finished speaking
  | { type: "youText"; text: string } // input transcription chunk
  | { type: "youSpeaking" } // first speech heard on the mic this turn
  | { type: "youDone" } // student finished their turn
  | { type: "flag"; flag: Omit<Inconsistency, "atMs"> } // flag_inconsistency tool call
  | { type: "end" } // end_session tool call
  | { type: "ended" }
  | { type: "level"; value: number }
  | { type: "tick"; ms: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reconnecting"; value: boolean };

// What the screen talks to. A Gemini Live implementation replaces the mock behind this.
export interface LiveEngine {
  start(emit: (e: LiveEvent) => void, canAsk: (q: AskQuestion) => boolean): void;
  finishTurn(): void; // student taps the mic / Done presenting
  sendText(text: string): void; // typed-answer fallback
  pause(): void;
  resume(): void;
  stop(): void;
}
