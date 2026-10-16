import { AudioContext, type AnalyserNode, type AudioBufferQueueSourceNode } from "react-native-audio-api";

import { PANEL, type Difficulty, type Mode } from "@/constants";
import { ApiError, api } from "@/utils/api";
import { createNoiseGate } from "@/utils/noise-gate";
import { decodePcm16, encodePcm16, utf8 } from "@/utils/pcm";
import { getRecorder } from "@/utils/recorder";

import type { AskQuestion, Inconsistency, LiveEngine, LiveEvent, QuestionType } from "./types";
import { alreadySaid } from "./said";
import { envelope, rms } from "./voice-envelope";
import { panelVoice } from "./voice-level";

// Phone ⇄ Gemini Live directly (addendum B1–B6). The server only mints a token with the panel's
// prompt and tools locked in. The student holds the floor until they tap done (manual activity:
// activityStart → mic audio → activityEnd), and the mic is never sent while the panel talks.
// With more than one panelist they question in turn (sequential panel): a Live session keeps the voice it starts
// with, so each panelist ("seat") gets their own session and voice, and the engine hands over between them.

const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const MIC_RATE = 16000; // Live API input
const VOICE_RATE = 24000; // Live API output
const ROLES = ["Chair", "Technical", "Methodology"]; // the tool's `panelist` values, in PANEL order
const RETRY_MS = 2000;
const QUIET_TURN_MS = 2500; // a turn that ended without a voice: wait this long for late audio
const CLOSE_GRACE_MS = 8000; // end_session but no spoken closing
const PANEL_WAIT_MS = 15000; // 3.8 Live may stay silent (proactive audio); nudge it after this
const STALL_MS = 12000; // the panel went quiet mid-turn and never sent turnComplete: treat the turn as over

export type SessionSetup = {
  mode: Mode;
  domain: string;
  panelists: number;
  minutes: number;
  followUps: number;
  difficulty: Difficulty;
  projectId?: string;
  weakFrom?: string; // the server turns that session's report into the round's focus
};

type FunctionCall = { id: string; name: string; args?: Record<string, unknown> };
type Token = { token: string; model: string; voice?: string };
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
  private note: (from: number, to: number) => string = () => "";
  private seat = 0; // the panelist whose session is live
  private seatMains = 0; // main questions this panelist has asked
  private passing = false; // this panelist is done: hand over once their turn settles
  private switching = false; // connecting the next panelist's session
  // The next panelist's token, fetched early (a promise, so a handover awaits it instead of fetching twice).
  private prefetched: { seat: number; at: number; token: Promise<Token> } | null = null;
  // The next panelist's session, opened while the current one hands over, so the switch is instant.
  private next: { seat: number; ws: WebSocket; ready: boolean; handle: string | null } | null = null;
  private flagged = false; // the panel flagged a contradiction since the student's last turn
  private mark = 0; // when the panel's reply (or a handover) started, for the timing log
  private stall: ReturnType<typeof setTimeout> | null = null;
  private ws: WebSocket | null = null;
  private ready = false; // setupComplete on the current socket
  private connected = false; // first setupComplete seen
  private handle: string | null = null; // session resumption across sockets
  private stopped = false;
  private connecting = false;
  private startId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private closeDeadline: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private studentFloor = false; // presenting or answering
  private activity = false; // activityStart sent, activityEnd not yet
  private spoke = false;
  private gate = createNoiseGate();
  private ctx: AudioContext | null = null;
  private voice: AudioBufferQueueSourceNode | null = null;
  private analyser: AnalyserNode | null = null; // between the voice and the speaker: what the panel face lip-syncs to
  private frame = new Float32Array(512);
  private lipSync: ReturnType<typeof setInterval> | null = null;
  private queued = 0; // panel audio buffers not yet played
  private heard = false; // panel audio since the student's last turn
  private turnDone = false; // turnComplete for the panel's current turn
  private ending: "no" | "asked" | "closing" = "no";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private marker: string | null = null; // closing char of a transcript marker still open across chunks
  private nudged = false; // asked a silent panel to go ahead once this turn
  private asked = false; // a question was approved since the student's last turn
  private spokeQuestion = false; // the panel's voice was heard after that approval
  private quiet = false; // the panel ran on after its question: drop its voice and words until the student's turn
  private spoken = ""; // what the panel has said since the student's turn ended
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(private setup: SessionSetup) {}

  start(emit: (e: LiveEvent) => void, canAsk: (q: AskQuestion) => boolean, note?: (from: number, to: number) => string) {
    this.emit = emit;
    this.canAsk = canAsk;
    if (note) this.note = note;

    this.ctx = new AudioContext({ sampleRate: VOICE_RATE });
    this.voice = this.ctx.createBufferQueueSource();
    // voice -> analyser -> speaker: the mouth follows the sound as it plays, not as Gemini sends it (it arrives early).
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.frame.length;
    this.voice.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.lipSync = setInterval(() => this.measureVoice(), 33);
    this.voice.onBufferEnded = () => {
      this.queued = Math.max(0, this.queued - 1);
      this.settle();
    };
    this.voice.start(0, 0); // plays silence while the queue is empty; the default offset (-1) fails the lib's own check

    void this.connect();
  }

  finishTurn() {
    if (!this.studentFloor) return;
    if (this.passing) return this.passAfterStudent();
    this.endStudentTurn();
    const last = this.gate.flush();
    if (last) this.sendMic(last);
    // Nothing said: a text note instead of a silent activity, which Gemini "transcribed" as made-up words.
    if (this.activity) this.send({ realtimeInput: { activityEnd: {} } });
    else this.sendTurn("(The student stayed silent and gave no answer.)");
    this.activity = false;
  }

  // Typed fallback. Works mid-activity: the text closes the turn and whatever was said joins it.
  sendText(text: string) {
    if (!this.studentFloor || !text.trim()) return;
    this.emit({ type: "youText", text: ` ${text.trim()}` });
    if (this.passing) return this.passAfterStudent();
    this.gate.flush();
    this.endStudentTurn();
    this.sendTurn(text.trim());
  }

  endForTime() {
    if (this.stopped || this.ending !== "no") return;
    const last = this.gate.flush();
    if (last && this.studentFloor) this.sendMic(last);
    if (this.activity) this.send({ realtimeInput: { activityEnd: {} } });
    this.activity = false;
    this.studentFloor = false;
    this.turnDone = false;
    this.ending = "asked";
    this.clearTimer();
    this.panelResponded();
    this.voice?.clearBuffers();
    this.queued = 0;
    this.emit({ type: "level", value: 0 });
    this.emit({ type: "end", reason: "time" });
    // Independent of playback/retries: a silent or disconnected panel cannot prolong the round.
    this.closeDeadline = setTimeout(() => this.finish(), CLOSE_GRACE_MS);
    this.sendTurn("(The practice time limit has been reached. Do not ask another question. Say one short closing sentence, then call end_session.)");
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
    this.clearStall();
    this.next?.ws.close();
    this.next = null;
    if (this.lipSync) clearInterval(this.lipSync);
    this.lipSync = null;
    panelVoice.value = 0;
    if (this.closeDeadline) clearTimeout(this.closeDeadline);
    this.closeDeadline = null;
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
    if (this.stopped || this.paused || this.ws || this.connecting) return;
    this.connecting = true;
    let token: string;
    let model: string;
    let voice: string | undefined;
    const pre = this.prefetched;
    try {
      // The next panelist's token, fetched while the last one was still questioning (a quicker handover).
      if (pre && pre.seat === this.seat && !this.handle && Date.now() - pre.at < 50_000) {
        this.prefetched = null;
        ({ token, model, voice } = await pre.token.catch(() => this.fetchToken(this.seat)));
      } else ({ token, model, voice } = await this.fetchToken(this.seat));
    } catch (err) {
      if (this.stopped) return;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408) {
        this.emit({ type: "error", message: err.message });
        this.stop();
        return;
      }
      console.warn("[live] token", err);
      return this.retry();
    } finally {
      this.connecting = false;
    }
    if (this.stopped || this.paused || this.ws) return;

    const ws = this.open({ token, model, voice }, this.handle);
    this.ws = ws;
    this.ready = false;
    this.attach(ws);
  }

  // A Live socket that sends its setup when it opens. Everything but the voice and the resumption handle is locked by
  // the token; the voice is the server's choice (it only takes effect when a session starts).
  private open({ token, model, voice }: Token, handle: string | null) {
    const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      const speech = voice ? { generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } } : {};
      ws.send(JSON.stringify({ setup: { model, ...speech, sessionResumption: handle ? { handle } : {} } }));
    };
    return ws;
  }

  private static parse(e: { data: unknown }) {
    const raw = typeof e.data === "string" ? e.data : utf8(new Uint8Array(e.data as ArrayBuffer));
    return JSON.parse(raw) as ServerMessage;
  }

  // The live socket's handlers.
  private attach(ws: WebSocket) {
    ws.onmessage = (e) => this.onMessage(GeminiEngine.parse(e));
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

  private fetchToken(seat: number) {
    return api<{ token: string; model: string; voice?: string }>("/live/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...this.setup, startId: this.startId, resume: !!this.handle && seat === this.seat, seat }),
    });
  }

  private get sequential() {
    return this.setup.panelists > 1;
  }

  private get lastSeat() {
    return this.seat >= this.setup.panelists - 1;
  }

  // Each panelist's share of main questions (server/src/modules/practice/domain/panel.ts seatShare).
  private get share() {
    return Math.max(2, Math.round(Math.max(2, Math.round(this.setup.minutes / 2.5)) / this.setup.panelists));
  }

  // Fetch the next panelist's token early; a failure just means the handover fetches it itself.
  private prefetch() {
    const seat = this.seat + 1;
    if (!this.sequential || seat >= this.setup.panelists || this.prefetched?.seat === seat) return;
    const token = this.fetchToken(seat);
    token.catch(() => {}); // a failure just means the handover fetches it again
    this.prefetched = { seat, at: Date.now(), token };
  }

  // Open the next panelist's session now (their token, setup and voice) while the current one says their handover
  // line, so it's ready the moment they finish. If it fails, the handover connects the usual way.
  private prepareNext() {
    const seat = this.seat + 1;
    if (!this.sequential || seat >= this.setup.panelists || this.next?.seat === seat || this.stopped) return;
    this.prefetch();
    const pre = this.prefetched!;
    pre.token
      .then((t) => {
        if (this.stopped || this.seat !== seat - 1 || this.next) return;
        const ws = this.open(t, null);
        const next = { seat, ws, ready: false, handle: null as string | null };
        this.next = next;
        if (this.prefetched === pre) this.prefetched = null;
        ws.onmessage = (e) => {
          const m = GeminiEngine.parse(e);
          if (m.setupComplete) next.ready = true;
          const u = m.sessionResumptionUpdate;
          if (u?.resumable && u.newHandle) next.handle = u.newHandle;
        };
        ws.onclose = () => {
          if (this.next === next) this.next = null;
        };
      })
      .catch(() => {});
  }

  // The next panelist takes over: the current session closes, theirs opens in their voice, and once it's ready they're
  // told what was covered (note) and begin.
  // The panelist handed over while the student held the floor: close their turn here, and the next panelist takes over
  // (what they said is in the transcript and the handover note, not sent to the panelist who left).
  private passAfterStudent() {
    this.gate.flush();
    this.activity = false;
    this.endStudentTurn();
    this.handOver();
  }

  private handOver() {
    const from = this.seat;
    this.clearTimer();
    this.clearStall();
    this.panelResponded();
    this.studentFloor = false;
    this.emit({ type: "level", value: 0 });
    const ws = this.ws;
    this.ws = null; // before close(): its onclose must not reconnect
    ws?.close();
    this.ready = false;
    this.handle = null;
    this.activity = false;
    this.seat = from + 1;
    this.seatMains = 0;
    this.passing = false;
    this.asked = false;
    this.spokeQuestion = false;
    this.quiet = false;
    this.spoken = "";
    this.turnDone = false;
    this.heard = false;
    this.nudged = false;
    this.switching = true;
    this.flagged = false;
    this.mark = Date.now();
    this.emit({ type: "handover", seat: this.seat });
    const next = this.next;
    this.next = null;
    if (next && next.seat === this.seat) {
      this.ws = next.ws;
      this.handle = next.handle;
      this.attach(next.ws);
      if (next.ready) this.onMessage({ setupComplete: {} }); // already set up: the new panelist begins now
      return;
    }
    next?.ws.close();
    void this.connect();
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
      if (this.switching) {
        // The next panelist's session is up: tell them what was covered, and they begin.
        this.switching = false;
        console.log(`[live] handover to seat ${this.seat}: session ready in ${Date.now() - this.mark} ms`);
        this.mark = Date.now();
        this.emit({ type: "reconnecting", value: false });
        this.sendTurn(this.note(this.seat - 1, this.seat));
        this.awaitPanel();
      } else if (!this.connected) {
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
    if (c.modelTurn || c.outputTranscription) {
      this.armStall();
      if (this.mark) {
        console.log(`[live] panel replied in ${Date.now() - this.mark} ms`);
        this.mark = 0;
      }
    }
    for (const part of c.modelTurn?.parts ?? []) if (part.inlineData?.data) this.play(part.inlineData.data);
    const said = this.quiet ? "" : c.outputTranscription?.text && this.stripMarkers(c.outputTranscription.text);
    if (said?.trim()) {
      this.spoken += said;
      this.emit({ type: "panelText", text: said });
    }
    if (c.inputTranscription?.text) this.emit({ type: "youText", text: c.inputTranscription.text });
    if (c.turnComplete) {
      this.clearStall();
      this.turnDone = true;
      this.settle();
    }
  }

  // Panel tools run on the device (addendum B4). The follow-up limit is enforced here, not trusted to the prompt.
  private onToolCall({ id, name, args = {} }: FunctionCall): { id: string; name: string; response: Record<string, unknown> } {
    let response: Record<string, unknown> = { ok: true };
    if (name === "ask_question") {
      if (this.ending !== "no")
        return { id, name, response: { allowed: false, instruction: "Practice has ended. Say only a short closing sentence." } };
      // One question per panel turn. The model sometimes calls ask_question again for the question it just asked.
      // Approving it let the panel run on (reacting to answers never given, question after question); refusing it with
      // "say it now" made it repeat the question, and it once read the refusal out loud. So: a repeat before any of the
      // question was heard is approved again, quietly (the first stays on screen); after that, the call is refused and
      // whatever the panel still says this turn is dropped, unheard and untranscribed, until the student's turn.
      if (this.asked) {
        if (!this.spokeQuestion) return { id, name, response: { allowed: true, instruction: "Approved. Say your short reaction, then the question, out loud now." } };
        this.quiet = true;
        return { id, name, response: { allowed: false, instruction: "Already asked. Say nothing more this turn." } };
      }
      const role = ROLES.indexOf(String(args.panelist));
      const q: AskQuestion = {
        topicId: String(args.topicId ?? "general"),
        text: String(args.questionText ?? ""),
        type: (args.questionType as QuestionType) ?? "CONCEPTUAL",
        isFollowUp: args.isFollowUp === true,
        // In turns, the asker is whoever's session this is.
        panelist: this.sequential ? this.seat : Math.max(0, role) % this.setup.panelists,
      };
      // Their share is done and they want another main question: hand over instead (the rest of the turn is muted).
      if (this.sequential && !this.lastSeat && !q.isFollowUp && this.seatMains >= this.share) {
        this.passing = true;
        this.quiet = true;
        this.prepareNext();
        return { id, name, response: { allowed: false, instruction: "Your part is done. Say nothing more." } };
      }
      if (this.canAsk(q)) {
        // Spoken first, tool call after: put it on screen under the right panelist, but don't let it be said again.
        if (alreadySaid(this.spoken, q.text)) {
          this.asked = true;
          this.spokeQuestion = true;
          this.quiet = true;
          this.countMain(q);
          this.emit({ type: "ask", question: q });
          return { id, name, response: { allowed: true, instruction: "Recorded. Say nothing more this turn." } };
        }
        this.asked = true;
        this.spokeQuestion = false;
        this.countMain(q);
        this.emit({ type: "ask", question: q });
        response = { allowed: true, instruction: "Approved. Say your short reaction, then the question, out loud now." }; // a bare ok sometimes ended the turn silently
      } else {
        response = {
          allowed: false,
          instruction: "Follow-up limit reached for this topic. Do not ask it. Pick a new topic and call ask_question again before speaking.",
        };
      }
    } else if (name === "flag_inconsistency") {
      this.emit({ type: "flag", flag: args as Omit<Inconsistency, "atMs"> });
      this.flagged = true;
      response = { ok: true, scheduling: "SILENT" };
    } else if (name === "pass_to_next") {
      // Only between panelists, and never while their question still waits for its answer.
      if (!this.sequential) return { id, name, response: { ok: true } };
      if (this.asked) return { id, name, response: { ok: false, instruction: "Not yet. Wait for the student's answer." } };
      if (!this.lastSeat) {
        this.passing = true;
        this.prepareNext();
        // It came after the turn ended and the floor went back to the student: if they haven't spoken, hand over now;
        // if they're speaking, it happens when they finish (finishTurn).
        if (this.studentFloor && !this.activity) this.handOver();
        return { id, name, response: { ok: true } };
      }
      return this.onToolCall({ id, name: "end_session", args }); // the last panelist ends the session
    } else if (name === "end_session") {
      // Not while a question is still waiting for its answer (the same run-on, ending without the student).
      if (this.asked) {
        this.quiet = true;
        return { id, name, response: { ok: false, instruction: "Not yet. Say nothing more this turn." } };
      }
      if (this.ending === "no") {
        this.ending = "asked";
        this.emit({ type: "end" });
      }
    }
    return { id, name, response };
  }

  // About 30 times a second: the playing voice's loudness -> the speaking face's mouth (panelVoice). Shut while
  // nothing is queued, paused or muted.
  private measureVoice() {
    let level = 0;
    if (this.analyser && this.queued > 0 && !this.paused && !this.quiet) {
      this.analyser.getFloatTimeDomainData(this.frame);
      level = rms(this.frame);
    }
    const next = envelope(panelVoice.value, level);
    if (next !== panelVoice.value) panelVoice.value = next;
  }

  // A turn with no question that names the next panelist ("…I'll pass the questioning to Engr. Santos") is a handover
  // even if the model never called pass_to_next.
  private saidHandover() {
    if (!this.sequential || this.lastSeat || this.asked) return false;
    const next = PANEL[this.seat + 1]?.name;
    return !!next && this.spoken.toLowerCase().includes(next.toLowerCase());
  }

  // Re-armed by every bit of panel output; if the panel goes quiet without ending its turn, end it here.
  private armStall() {
    this.clearStall();
    this.stall = setTimeout(() => {
      if (this.stopped || this.paused || this.studentFloor || this.turnDone) return;
      this.turnDone = true;
      this.queued = 0;
      this.settle();
    }, STALL_MS);
  }

  private clearStall() {
    if (this.stall) clearTimeout(this.stall);
    this.stall = null;
  }

  // A main question counts toward this panelist's share; reaching it fetches the next panelist's token early.
  private countMain(q: AskQuestion) {
    if (q.isFollowUp) return;
    this.seatMains++;
    if (this.sequential && this.seatMains >= this.share) this.prefetch();
  }

  private play(b64: string) {
    if (!this.ctx || !this.voice || this.quiet) return;
    if (this.asked) this.spokeQuestion = true;
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
    } else if (this.passing || this.saidHandover()) {
      this.handOver();
    } else if (this.heard) {
      this.giveFloor();
    } else if (this.flagged && !this.asked && !this.nudged) {
      // It only flagged a contradiction and stopped (the flag's silent reply can end its turn): go ahead right away
      // instead of waiting for late audio, so the challenge or next question comes promptly.
      this.nudged = true;
      this.turnDone = false;
      this.sendTurn("(Go ahead: react to the answer and ask your next question through ask_question.)");
      this.awaitPanel();
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
    this.mark = Date.now();
    this.flagged = false;
    this.studentFloor = false;
    this.turnDone = false;
    this.nudged = false;
    this.asked = false;
    this.spokeQuestion = false;
    this.quiet = false;
    this.spoken = "";
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
    if (out) this.sendMic(out);
  }

  // The turn's activity opens at the first voiced chunk; until then nothing is sent at all.
  private sendMic({ samples, voiced }: { samples: Float32Array; voiced: boolean }) {
    if (!this.activity) {
      if (!voiced) return;
      this.send({ realtimeInput: { activityStart: {} } });
      this.activity = true;
    }
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
