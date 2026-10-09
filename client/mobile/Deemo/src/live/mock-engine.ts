import { CLOSING, PRESENTATION, SCRIPT } from "./script";
import type { AskQuestion, LiveEngine, LiveEvent } from "./types";

const TICK = 100;

type Job = { left: number; run: () => void; tag?: "you" };

// Plays the sample defense through the same events the Gemini Live engine will emit.
// Jobs only count down while not paused, so pausing freezes the panel mid-sentence.
export class MockEngine implements LiveEngine {
  private emit: (e: LiveEvent) => void = () => {};
  private canAsk: (q: AskQuestion) => boolean = () => true;
  private jobs: Job[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private next = 0; // next SCRIPT item
  private turn: "none" | "presenting" | "answering" = "none";

  start(emit: (e: LiveEvent) => void, canAsk: (q: AskQuestion) => boolean) {
    this.emit = emit;
    this.canAsk = canAsk;
    this.timer = setInterval(() => this.tick(), TICK);
    this.after(1800, () => {
      emit({ type: "connected" });
      this.turn = "presenting";
      this.speakAsStudent(PRESENTATION);
    });
  }

  finishTurn() {
    if (this.turn === "none") return;
    this.turn = "none";
    this.jobs = this.jobs.filter((j) => j.tag !== "you");
    this.emit({ type: "level", value: 0 });
    this.emit({ type: "youDone" });
    this.after(1400, () => this.ask()); // "thinking" beat
  }

  sendText(text: string) {
    if (this.turn === "none" || !text.trim()) return;
    this.jobs = this.jobs.filter((j) => j.tag !== "you");
    this.emit({ type: "youText", text: ` ${text.trim()}` });
    this.finishTurn();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.jobs = [];
  }

  private tick() {
    if (this.paused) return;
    for (const j of this.jobs) j.left -= TICK;
    const due = this.jobs.filter((j) => j.left <= 0);
    this.jobs = this.jobs.filter((j) => j.left > 0);
    due.forEach((j) => j.run());
  }

  private after(ms: number, run: () => void, tag?: Job["tag"]) {
    this.jobs.push({ left: ms, run, tag });
  }

  private ask(): void {
    const item = SCRIPT[this.next++];
    if (!item) return this.close();
    const q: AskQuestion = {
      topicId: item.topicId,
      text: item.question,
      type: item.type,
      isFollowUp: !!item.isFollowUp,
      panelist: item.panelist,
    };
    if (!this.canAsk(q)) return this.ask(); // follow-up limit reached: move to the next topic
    this.emit({ type: "ask", question: q });
    const words = item.question.split(" ");
    words.forEach((w, i) => this.after(110 * (i + 1), () => this.emit({ type: "panelText", text: `${i ? " " : ""}${w}` })));
    this.after(110 * words.length + 400, () => {
      this.emit({ type: "panelDone" });
      this.turn = "answering";
      this.after(1200, () => this.speakAsStudent(item.answer, item.flag)); // the student's response latency
    });
  }

  // Simulated student speech: transcription chunks plus a mic level, until they tap the mic.
  private speakAsStudent(text: string, flag?: (typeof SCRIPT)[number]["flag"]) {
    const words = text.split(" ");
    const flagAt = Math.floor(words.length * 0.7);
    words.forEach((w, i) =>
      this.after(
        280 * (i + 1),
        () => {
          this.emit({ type: "youText", text: `${i ? " " : ""}${w}` });
          this.emit({ type: "level", value: 0.35 + Math.random() * 0.65 });
          if (flag && i === flagAt) this.emit({ type: "flag", flag });
          if (i === words.length - 1) this.emit({ type: "level", value: 0.05 });
        },
        "you",
      ),
    );
  }

  private close(): void {
    this.emit({ type: "end" });
    const words = CLOSING.split(" ");
    words.forEach((w, i) => this.after(110 * (i + 1), () => this.emit({ type: "panelText", text: `${i ? " " : ""}${w}` })));
    this.after(110 * words.length + 400, () => this.emit({ type: "panelDone" }));
    this.after(110 * words.length + 1800, () => this.emit({ type: "ended" }));
  }
}
