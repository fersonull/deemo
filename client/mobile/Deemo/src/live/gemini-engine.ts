import { AudioContext, type AudioBufferQueueSourceNode } from "react-native-audio-api";

import { API_URL, type Mode } from "@/constants";
import { createNoiseGate } from "@/utils/noise-gate";
import { decodePcm16, encodePcm16, utf8 } from "@/utils/pcm";
import { getRecorder } from "@/utils/recorder";

import type { AskQuestion, Inconsistency, LiveEngine, LiveEvent, QuestionType } from "./types";

// Phone ⇄ Gemini Live directly (addendum B1–B6). The server only mints a token with the panel's
// prompt and tools locked in. The student holds the floor until they tap done (manual activity:
// activityStart → mic audio → activityEnd), and the mic is never sent while the panel talks.

const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const MIC_RATE = 16000; // Live API input
const VOICE_RATE = 24000; // Live API output
const ROLES = ["Chair", "Technical", "Methodology"]; // the tool's `panelist` values, in PANEL order
const RETRY_MS = 2000;
const QUIET_TURN_MS = 5000; // a turn that ended without a voice: wait this long for late audio
const CLOSE_GRACE_MS = 8000; // end_session but no spoken closing
const PANEL_WAIT_MS = 15000; // 3.8 Live may stay silent (proactive audio); nudge it after this

export type SessionSetup = { mode: Mode; domain: string; panelists: number; minutes: number };

type FunctionCall = { id: string; name: string; args?: Record<string, unknown> };
type ServerMessage = {
  setupComplete?: object;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls?: FunctionCall[] };
  sessionResumptionUpdate?: { newHandle?: string; resumable?: boolean };
};

export class GeminiEngine implements LiveEngine {
  private emit: (e: LiveEvent) => void = () => {};
  private canAsk: (q: AskQuestion) => boolean = () => true;
  private ws: WebSocket | null = null;
  private ready = false; // setupComplete on the current socket
  private connected = false; // first setupComplete seen
  private handle: string | null = null; // session resumption across sockets
  private stopped = false;
  private paused = false;
  private studentFloor = false; // presenting or answering
  private activity = false; // activityStart sent, activityEnd not yet
  private spoke = false;
  private gate = createNoiseGate();
  private ctx: AudioContext | null = null;
  private voice: AudioBufferQueueSourceNode | null = null;
  private queued = 0; // panel audio buffers not yet played
  private heard = false; // panel audio since the student's last turn
  private turnDone = false; // turnComplete for the panel's current turn
  private ending: "no" | "asked" | "closing" = "no";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private marker: string | null = null; // closing char of a transcript marker still open across chunks
  private nudged = false; // asked a silent panel to go ahead once this turn
  private asked = false; // a question was approved since the student's last turn
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(private setup: SessionSetup) {}

  start(emit: (e: LiveEvent) => void, canAsk: (q: AskQuestion) => boolean) {
    this.emit = emit;
    this.canAsk = canAsk;

    this.ctx = new AudioContext({ sampleRate: VOICE_RATE });
    this.voice = this.ctx.createBufferQueueSource();
    this.voice.connect(this.ctx.destination);
    this.voice.onBufferEnded = () => {
      this.queued = Math.max(0, this.queued - 1);
      this.settle();
    };
    this.voice.start(0, 0); // plays silence while the queue is empty; the default offset (-1) fails the lib's own check

    void this.connect();
  }

  finishTurn() {
    if (!this.studentFloor) return;
    this.endStudentTurn();
    const last = this.gate.flush();
    if (last && this.activity) this.sendAudio(last);
    if (this.activity) this.send({ realtimeInput: { activityEnd: {} } });
    else this.sendTurn("(no answer)");
    this.activity = false;
  }

  // Typed fallback. Works mid-activity: the text closes the turn and whatever was said joins it.
  sendText(text: string) {
    if (!this.studentFloor || !text.trim()) return;
    this.emit({ type: "youText", text: ` ${text.trim()}` });
    this.gate.flush();
    this.endStudentTurn();
    this.sendTurn(text.trim());
  }

  pause() {
    this.paused = true;
    this.emit({ type: "level", value: 0 });
    void this.ctx?.suspend(); // the panel's voice stops mid-word and picks up on resume
  }

  resume() {
    this.paused = false;
    void this.ctx?.resume();
    if (!this.ws) void this.connect(); // the socket closed during the pause
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.clearTimer();
    this.panelResponded();
    const ws = this.ws;
    this.ws = null; // before close(): its onclose must not reconnect or finish again
    ws?.close();
    const r = getRecorder();
    r.clearOnAudioReady();
    r.stop();
    this.voice?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private async connect() {
    if (this.stopped || this.paused || this.ws) return;
    let token: string;
    let model: string;
    try {
      const res = await fetch(`${API_URL}/live/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(this.setup),
      });
      if (!res.ok) throw new Error(`token ${res.status}`);
      ({ token, model } = await res.json());
    } catch (err) {
      console.warn("[live] token", err);
      return this.retry();
    }
    if (this.stopped || this.ws) return;

    const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    this.ready = false;
    ws.onopen = () => {
      // Everything but the resumption handle is locked by the token.
      ws.send(JSON.stringify({ setup: { model, sessionResumption: this.handle ? { handle: this.handle } : {} } }));
    };
    ws.onmessage = (e) => {
      const raw = typeof e.data === "string" ? e.data : utf8(new Uint8Array(e.data as ArrayBuffer));
      this.onMessage(JSON.parse(raw) as ServerMessage);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      console.warn("[live] closed", e.code, e.reason);
      this.ws = null;
      this.ready = false;
      this.activity = false; // the server drops an unfinished activity; the next mic buffer reopens it
      if (this.ending !== "no" && this.turnDone) return this.finish(); // closed after the goodbye
      this.retry();
    };
  }

  private retry() {
    if (this.stopped || this.paused) return; // resume() reconnects
    if (this.connected) this.emit({ type: "reconnecting", value: true });
    this.clearTimer();
    this.timer = setTimeout(() => void this.connect(), RETRY_MS);
  }

  private onMessage(m: ServerMessage) {
    if (m.setupComplete) {
      this.ready = true;
      if (!this.connected) {
        this.connected = true;
        this.startMic();
        this.studentFloor = true; // the student opens with their presentation
        this.emit({ type: "connected" });
      } else {
        this.emit({ type: "reconnecting", value: false });
        // The drop ate the panel's turn or the student's "done": ask the panel to pick it back up.
        if (!this.studentFloor && !this.turnDone && this.ending === "no")
          this.sendTurn("(My connection dropped. Please continue.)");
      }
    }

    const update = m.sessionResumptionUpdate;
    if (update?.resumable && update.newHandle) this.handle = update.newHandle;

    if (m.toolCall) {
      this.panelResponded();
      // One reply for the whole batch: answering a flag+ask batch piecemeal left the panel silent.
      const functionResponses = (m.toolCall.functionCalls ?? []).map((call) => this.onToolCall(call));
      this.send({ toolResponse: { functionResponses } });
    }

    const c = m.serverContent;
    if (!c) return;
    if (c.modelTurn || c.outputTranscription || c.turnComplete) this.panelResponded();
    // The panel never talks over the student. Late speech here is a repeat (e.g. answering a nudge
    // after its first reply already played), so it is dropped rather than played twice.
    if (this.studentFloor) {
      if (c.inputTranscription?.text) this.emit({ type: "youText", text: c.inputTranscription.text });
      return;
    }
    for (const part of c.modelTurn?.parts ?? []) if (part.inlineData?.data) this.play(part.inlineData.data);
    const said = c.outputTranscription?.text && this.stripMarkers(c.outputTranscription.text);
    if (said?.trim()) this.emit({ type: "panelText", text: said });
    if (c.inputTranscription?.text) this.emit({ type: "youText", text: c.inputTranscription.text });
    if (c.turnComplete) {
      this.turnDone = true;
      this.settle();
    }
  }

  // Panel tools run on the device (addendum B4). The follow-up limit is enforced here, not trusted to the prompt.
  private onToolCall({ id, name, args = {} }: FunctionCall) {
    let response: Record<string, unknown> = { ok: true };
    if (name === "ask_question") {
      const role = ROLES.indexOf(String(args.panelist));
      const q: AskQuestion = {
        topicId: String(args.topicId ?? "general"),
        text: String(args.questionText ?? ""),
        type: (args.questionType as QuestionType) ?? "CONCEPTUAL",
        isFollowUp: args.isFollowUp === true,
        panelist: Math.max(0, role) % this.setup.panelists,
      };
      if (this.canAsk(q)) {
        this.asked = true;
        this.emit({ type: "ask", question: q });
        response = { allowed: true, instruction: "Approved. Say your short reaction, then the question, out loud now." }; // a bare ok sometimes ended the turn silently
      } else {
        response = {
          allowed: false,
          instruction:
            "Follow-up limit reached for this topic. Do not ask it. Pick a new topic and call ask_question again before speaking.",
        };
      }
    } else if (name === "flag_inconsistency") {
      this.emit({ type: "flag", flag: args as Omit<Inconsistency, "atMs"> });
      response = { ok: true, scheduling: "SILENT" };
    } else if (name === "end_session") {
      this.ending = "asked";
      this.emit({ type: "end" });
    }
    return { id, name, response };
  }

  private play(b64: string) {
    if (!this.ctx || !this.voice) return;
    const samples = decodePcm16(b64);
    const buffer = this.ctx.createBuffer(1, samples.length, VOICE_RATE);
    buffer.copyToChannel(samples, 0);
    this.voice.enqueueBuffer(buffer);
    this.queued++;
    this.heard = true;
    this.turnDone = false;
    if (this.ending === "asked") this.ending = "closing";
    this.clearTimer();
  }

  // The panel's turn is over once Gemini says so AND its voice has finished playing.
  private settle() {
    if (!this.turnDone || this.queued > 0 || this.studentFloor || this.stopped) return;
    this.clearTimer();
    if (this.ending === "closing") {
      this.emit({ type: "panelDone" });
      this.timer = setTimeout(() => this.finish(), 1200);
    } else if (this.ending === "asked") {
      this.timer = setTimeout(() => this.finish(), CLOSE_GRACE_MS); // the goodbye usually follows as its own turn
    } else if (this.heard) {
      this.giveFloor();
    } else {
      // A turn with no voice (tool-only, or the model chose silence). Audio may still follow. If a
      // question was approved it is on screen, so just hand the floor back: nudging here made the
      // panel repeat itself when its voice was only late. Otherwise ask it to go ahead, once.
      this.timer = setTimeout(() => {
        if (this.nudged || this.asked) return this.giveFloor();
        this.nudged = true;
        this.turnDone = false;
        this.sendTurn("(Please go ahead.)");
        this.awaitPanel();
      }, QUIET_TURN_MS);
    }
  }

  // Drops markers like "<no speech detected>" / "{pause}" (sent when the model chooses silence), even split across chunks.
  private stripMarkers(text: string): string {
    let out = "";
    for (const ch of text) {
      if (this.marker) {
        if (ch === this.marker) this.marker = null;
      } else if (ch === "<" || ch === "{") {
        this.marker = ch === "<" ? ">" : "}";
      } else {
        out += ch;
      }
    }
    return out;
  }

  private giveFloor() {
    this.heard = false;
    this.studentFloor = true;
    this.spoke = false;
    this.emit({ type: "panelDone" });
  }

  private endStudentTurn() {
    this.studentFloor = false;
    this.turnDone = false;
    this.nudged = false;
    this.asked = false;
    this.awaitPanel();
    this.emit({ type: "level", value: 0 });
    this.emit({ type: "youDone" });
  }

  private finish() {
    if (this.stopped) return;
    this.emit({ type: "ended" });
    this.stop();
  }

  // Started after setupComplete, by when the mic check screen has released the shared recorder.
  // Permission was granted on the mic check; buffers are encoded and sent, never stored.
  private startMic() {
    const r = getRecorder();
    r.onAudioReady({ sampleRate: MIC_RATE, bufferLength: MIC_RATE / 10, channelCount: 1 }, ({ buffer }) =>
      this.onMic(buffer.getChannelData(0)),
    );
    void r.start();
  }

  private onMic(samples: Float32Array) {
    if (!this.studentFloor || this.paused || !this.ready) return;
    const { level, speech, out } = this.gate.push(samples); // non-voice chunks come back as silence
    this.emit({ type: "level", value: level });
    if (!this.spoke && speech) {
      this.spoke = true;
      this.emit({ type: "youSpeaking" });
    }
    if (!this.activity) {
      this.send({ realtimeInput: { activityStart: {} } });
      this.activity = true;
    }
    if (out) this.sendAudio(out);
  }

  private sendAudio(samples: Float32Array) {
    this.send({ realtimeInput: { audio: { data: encodePcm16(samples), mimeType: `audio/pcm;rate=${MIC_RATE}` } } });
  }

  private send(message: object) {
    if (this.ready) this.ws?.send(JSON.stringify(message));
  }

  // Re-arms until the panel says or does something; never fires a nudge while paused.
  private awaitPanel() {
    this.panelResponded();
    this.watchdog = setTimeout(() => {
      if (!this.paused) this.sendTurn("(I'm done answering. Please continue.)");
      this.awaitPanel();
    }, PANEL_WAIT_MS);
  }

  private panelResponded() {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private sendTurn(text: string) {
    this.send({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } });
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
