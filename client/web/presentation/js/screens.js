// App screens drawn with Canvas 2D in the prototype's own 360×760 coordinates
// (docs/design/DEEMO Prototype.dc.html), rendered at the phone's on-screen size (setScale) and used as its
// screen texture. Matching the display size and skipping mipmaps keeps the text sharp.
// Screens with a real app screenshot (assets/screens, cropped to the screen) show that instead; the drawn ones remain
// for the splash and as a fallback if an image fails to load.

export const W = 360;
export const H = 760;

const C = {
  paper: "#F7F3EC", sand: "#EDE5D8", banner: "#F1E6D6", ink: "#2A2420", inkSoft: "#3E3731",
  inkMuted: "#5E554D", muted: "#8A7F74", faint: "#B0A698", dusk: "#5A66C7", duskIcon: "#4D57B7",
  duskInk: "#343996", duskTint: "#DCE3FF", duskSoft: "#CFD6F3", amber: "#EBB353", amberInk: "#6C4302",
  amberWash: "rgba(235,179,83,0.35)", amberMark: "rgba(235,179,83,0.5)", sage: "#4A9266", sageSoft: "#BEE2C9",
  chair: "#E4D9C6",
};
const F = {
  display: (w, s) => `${w} ${s}px "Bricolage Grotesque"`,
  body: (w, s) => `${w} ${s}px "DM Sans"`,
  mono: (w, s) => `${w} ${s}px "DM Mono"`,
  icon: (s) => `${s}px "Material Symbols Rounded"`,
};

// ── drawing helpers ──
function rr(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
// The owl "blob": CSS border-radius 58% 42% 52% 48% / 55% 50% 50% 45%.
function blob(ctx, x, y, w, h, fill) {
  const [tl, tr, br, bl] = [[0.58, 0.55], [0.42, 0.5], [0.52, 0.5], [0.48, 0.45]].map(([a, b]) => [a * w, b * h]);
  ctx.beginPath();
  ctx.moveTo(x + tl[0], y);
  ctx.lineTo(x + w - tr[0], y);
  ctx.ellipse(x + w - tr[0], y + tr[1], tr[0], tr[1], 0, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - br[1]);
  ctx.ellipse(x + w - br[0], y + h - br[1], br[0], br[1], 0, 0, Math.PI / 2);
  ctx.lineTo(x + bl[0], y + h);
  ctx.ellipse(x + bl[0], y + h - bl[1], bl[0], bl[1], 0, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + tl[1]);
  ctx.ellipse(x + tl[0], y + tl[1], tl[0], tl[1], 0, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function text(ctx, str, x, y, font, color, { align = "left", ls = 0, base = "alphabetic" } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.letterSpacing = `${ls}px`;
  ctx.fillText(str, x, y);
  ctx.letterSpacing = "0px";
  return ctx.measureText(str).width;
}
// Word-wraps into maxW; returns the y after the last line.
function para(ctx, str, x, y, maxW, lh, font, color) {
  ctx.font = font;
  let line = "";
  for (const word of str.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      text(ctx, line, x, y, font, color);
      line = word;
      y += lh;
    } else line = next;
  }
  text(ctx, line, x, y, font, color);
  return y + lh;
}
function icon(ctx, name, x, y, size, color, align = "left") {
  text(ctx, name, x, y, F.icon(size), color, { align, base: "middle" });
}
function label(ctx, str, x, y) {
  text(ctx, str, x, y, F.mono(500, 10), C.muted, { ls: 1.2 });
}

function statusBar(ctx, dark = false) {
  const c = dark ? C.paper : C.ink;
  text(ctx, "9:41", 26, 22, F.body(600, 12.5), c);
  icon(ctx, "signal_cellular_alt", 296, 17, 15, c, "right");
  icon(ctx, "wifi", 314, 17, 15, c, "right");
  icon(ctx, "battery_full", 336, 17, 15, c, "right");
}
function backRow(ctx, name = "arrow_back") {
  icon(ctx, name, 22, 60, 24, C.ink);
}
function bg(ctx, color = C.paper) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

// ── panelists (session) ──
const PANEL = [
  { short: "Chair", fill: C.chair, look: "cap" },
  { short: "Technical", fill: C.duskSoft, look: "glasses" },
  { short: "Methodology", fill: C.sageSoft, look: "card" },
];
function panelist(ctx, p, cx, baseY, talking, t) {
  const w = talking ? 70 : 58;
  const h = talking ? 60 : 50;
  const x = cx - w / 2;
  const y = baseY - h;
  if (talking) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4);
    blob(ctx, x - 5, y - 5, w + 10, h + 10, C.duskTint);
    ctx.restore();
  }
  blob(ctx, x, y, w, h, p.fill);
  if (p.look === "cap") rr(ctx, x + w * 0.29, y - 7, w * 0.42, 7, 3, C.ink);
  const ey = y + h * 0.42;
  if (p.look === "glasses") {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    rr(ctx, x + w * 0.2, ey - 7, w * 0.24, 14, 5);
    ctx.stroke();
    rr(ctx, x + w * 0.56, ey - 7, w * 0.24, 14, 5);
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  for (const ex of [0.32, 0.68]) {
    ctx.beginPath();
    ctx.ellipse(x + w * ex, ey, 3, talking ? 4 : 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.look === "card") {
    rr(ctx, x + w * 0.78, y + h * 0.14, w * 0.15, h * 0.24, 3, C.paper);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (talking) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    const mh = 3 + Math.abs(Math.sin(t * 9) * Math.sin(t * 3.1)) * 8;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.7, 6, mh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  text(ctx, p.short, cx, baseY + 18, F.body(600, 11.5), C.ink, { align: "center" });
  text(ctx, talking ? "Asking" : "Listening", cx, baseY + 32, F.body(500, 10.5), talking ? C.duskIcon : C.muted, { align: "center" });
}

function session(ctx, t, flag) {
  bg(ctx);
  statusBar(ctx);
  // stage pill + End
  rr(ctx, 18, 44, 132, 36, 18, C.sand);
  text(ctx, "Pre-Oral", 32, 67, F.body(600, 13), C.ink);
  const secs = 252 + Math.floor(t);
  text(ctx, `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`, 96, 67, F.mono(500, 13), C.inkMuted);
  rr(ctx, 278, 40, 64, 44, 22, C.sand);
  text(ctx, "End", 310, 67, F.body(600, 13), C.ink, { align: "center" });

  // panel row
  const talker = 2;
  [92, 180, 268].forEach((cx, i) => panelist(ctx, PANEL[i], cx, 172, i === talker, t));

  // question card
  const cardY = 226;
  const cardH = flag ? 196 : 176;
  rr(ctx, 14, cardY, 332, cardH, 26, C.sand);
  rr(ctx, 32, cardY + 16, 112, 26, 13, C.paper);
  icon(ctx, "science", 42, cardY + 29, 14, C.ink);
  text(ctx, "Methodology", 60, cardY + 33, F.body(600, 11.5), C.ink);
  if (flag) {
    rr(ctx, 150, cardY + 16, 80, 26, 13, C.duskTint);
    text(ctx, "Follow-up", 190, cardY + 33, F.body(600, 11.5), C.duskInk, { align: "center" });
  }
  text(ctx, "Q2 of 6", 328, cardY + 33, F.mono(500, 11), C.muted, { align: "right" });
  icon(ctx, "record_voice_over", 32, cardY + 62, 15, C.inkMuted);
  text(ctx, "Methodology panelist", 52, cardY + 66, F.body(600, 12), C.inkMuted);
  const q = flag
    ? "You said about fifty users. Chapter 3 says thirty respondents. Which is it?"
    : "Walk me through how you chose your respondents.";
  para(ctx, q, 32, cardY + 98, 296, 27, F.display(700, 22), C.ink);

  // transcript
  let ty = cardY + cardH + 32;
  const line = (dot, name, body, mark) => {
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(25.5, ty - 4.5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    const nw = text(ctx, name, 36, ty, F.body(600, 13.5), C.ink);
    const parts = body.split("|");
    let x = 36 + nw + 6;
    let y = ty;
    ctx.font = F.body(400, 13.5);
    parts.forEach((part, i) => {
      for (const word of part.split(" ").filter(Boolean)) {
        const ww = ctx.measureText(`${word} `).width;
        if (x + ww > 338) { x = 36; y += 19.5; }
        if (i === 1 && mark) rr(ctx, x - 2, y - 13, ww + 1, 18, 4, C.amberMark);
        text(ctx, word, x, y, F.body(400, 13.5), C.inkMuted);
        x += ww;
      }
    });
    ty = y + 30;
  };
  line(C.sageSoft, "Methodology", "Walk me through how you chose your respondents.");
  line(C.dusk, "You", flag ? "We tested it with |about fifty users| from two sections." : "We used purposive sampling from the fourth-year sections…", flag);
  if (flag) {
    // coach-mode honey dot: a contradiction was noted
    rr(ctx, 22, ty - 16, 316, 40, 14, C.amberWash);
    icon(ctx, "error", 34, ty + 4, 16, C.amberInk);
    text(ctx, "Differs from Ch. 3, p. 34 · 30 respondents", 56, ty + 8, F.body(600, 12), C.amberInk);
  }

  // controls
  const by = 690;
  rr(ctx, 22, by - 24, 48, 48, 24, C.sand);
  icon(ctx, "keyboard", 46, by, 22, C.ink, "center");
  const pulse = 1 + 0.06 * Math.sin(t * 3);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(180, by, 44 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = C.dusk;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(180, by, 36, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  icon(ctx, "mic", 180, by, 30, C.paper, "center");
  rr(ctx, 278, by - 22, 64, 44, 22, C.sand);
  text(ctx, "Done", 310, by + 5, F.body(600, 13), C.ink, { align: "center" });
}

// ── screens ──
const DRAW = {
  splash(ctx, t, img) {
    bg(ctx);
    statusBar(ctx);
    const s = 132;
    ctx.save();
    rr(ctx, (W - s) / 2, 268, s, s, 36);
    ctx.clip();
    if (img) ctx.drawImage(img, (W - s) / 2, 268, s, s);
    ctx.restore();
    text(ctx, "deemo", W / 2, 462, F.display(800, 44), C.ink, { align: "center", ls: -1.6 });
    text(ctx, "Your panel has read your paper.", W / 2, 494, F.body(400, 14), C.inkMuted, { align: "center" });
  },

  // Matches src/app/consent.tsx; the checked boxes illustrate the accepted state.
  consent(ctx) {
    bg(ctx);
    statusBar(ctx);
    backRow(ctx);
    text(ctx, "Before you", 20, 116, F.display(800, 30), C.ink, { ls: -1 });
    text(ctx, "practice.", 20, 147, F.display(800, 30), C.ink, { ls: -1 });
    para(ctx, "What happens to your work, in plain words.", 20, 176, 300, 20, F.body(400, 14), C.inkMuted);
    const items = [
      ["description", "Your manuscript and voice are processed by Google's AI to run the panel."],
      ["mic_off", "No audio is recorded. Only the text transcript is kept."],
      ["lock", "Your sessions are private. Share them with your group only if you choose."],
      ["delete", "You can delete everything any time from Profile."],
    ];
    items.forEach(([name, body], i) => {
      const y = 210 + i * 82;
      rr(ctx, 20, y, 320, 74, 18, C.sand);
      icon(ctx, name, 34, y + 27, 21, C.duskIcon);
      para(ctx, body, 66, y + 26, 256, 18, F.body(400, 13.5), C.ink);
    });
    ["I am 18 years old or older.", "I understand and agree to how my data is used."].forEach((body, i) => {
      const y = 562 + i * 50;
      rr(ctx, 20, y, 24, 24, 8, C.ink);
      icon(ctx, "check", 32, y + 12, 18, C.paper, "center");
      para(ctx, body, 56, y + 16, 282, 19, F.body(400, 13.5), C.ink);
    });
    rr(ctx, 20, 680, 320, 58, 29, C.ink);
    text(ctx, "Continue", 180, 714, F.body(600, 16), C.paper, { align: "center" });
  },

  // Profile's data controls, using the shipped labels rather than a fictional privacy page.
  privacy(ctx) {
    bg(ctx);
    statusBar(ctx);
    text(ctx, "Profile", 20, 86, F.display(800, 34), C.ink, { ls: -1.2 });
    blob(ctx, 20, 116, 58, 54, C.duskTint);
    icon(ctx, "person", 49, 143, 30, C.duskIcon, "center");
    text(ctx, "Your account", 94, 141, F.display(700, 21), C.ink);
    text(ctx, "Account settings", 94, 163, F.body(400, 13), C.inkMuted);
    label(ctx, "PRACTICE", 20, 218);
    rr(ctx, 20, 234, 320, 108, 18, C.sand);
    text(ctx, "Your course", 36, 266, F.body(600, 14), C.ink);
    text(ctx, "BSIT", 324, 266, F.body(400, 13), C.inkMuted, { align: "right" });
    text(ctx, "Allow typed answers", 36, 316, F.body(600, 14), C.ink);
    rr(ctx, 278, 298, 46, 26, 13, C.dusk);
    rr(ctx, 300, 301, 20, 20, 10, C.paper);
    label(ctx, "YOUR DATA", 20, 388);
    rr(ctx, 20, 404, 320, 148, 18, C.sand);
    text(ctx, "Download my data", 36, 438, F.body(600, 15), C.ink);
    para(ctx, "Your manuscripts' summaries, transcripts and reports, as one file.", 36, 462, 282, 19, F.body(400, 13), C.inkMuted);
    ctx.fillStyle = C.paper;
    ctx.fillRect(36, 506, 288, 1);
    text(ctx, "Delete my data", 36, 536, F.body(600, 15), C.ink);
    rr(ctx, 20, 584, 320, 54, 27, C.sand);
    text(ctx, "Sign out", 180, 617, F.body(600, 15), C.ink, { align: "center" });
    tabBar(ctx, 3);
  },

  projects(ctx) {
    bg(ctx);
    statusBar(ctx);
    text(ctx, "Projects", 20, 86, F.display(800, 34), C.ink, { ls: -1.2 });
    text(ctx, "One manuscript per project.", 20, 112, F.body(400, 14), C.inkMuted);
    const cards = [
      { icon: "description", title: ["DEEMO: A Voice-Based AI", "Mock Panel Simulator"], meta: "Pre-Oral · analyzed Oct 9", ring: true },
      { icon: "group", title: ["Group copy: Chapters 1–3"], meta: "Shared with 3 members" },
    ];
    let y = 132;
    for (const c of cards) {
      const h = c.title.length > 1 ? 96 : 76;
      rr(ctx, 20, y, 320, h, 22, C.sand);
      if (c.ring) {
        ctx.strokeStyle = C.dusk;
        ctx.lineWidth = 2;
        rr(ctx, 20, y, 320, h, 22);
        ctx.stroke();
      }
      rr(ctx, 36, y + 16, 42, 42, 14, C.paper);
      icon(ctx, c.icon, 57, y + 37, 21, C.duskIcon, "center");
      c.title.forEach((l, i) => text(ctx, l, 90, y + 34 + i * 19.5, F.body(600, 14.5), C.ink));
      text(ctx, c.meta, 90, y + 34 + c.title.length * 19.5 + 2, F.body(400, 12), C.muted);
      y += h + 8;
    }
    ctx.strokeStyle = C.sand;
    ctx.lineWidth = 1.5;
    rr(ctx, 20, y, 320, 62, 22);
    ctx.stroke();
    rr(ctx, 36, y + 10, 42, 42, 14, C.sand);
    icon(ctx, "group_add", 57, y + 31, 21, C.duskIcon, "center");
    text(ctx, "Join with a code", 90, y + 30, F.body(600, 14.5), C.ink);
    text(ctx, "From your group leader", 90, y + 47, F.body(400, 12), C.muted);
    y += 74;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "rgba(42,36,32,0.18)";
    ctx.lineWidth = 2;
    rr(ctx, 20, y, 320, 58, 22);
    ctx.stroke();
    ctx.setLineDash([]);
    icon(ctx, "upload_file", 100, y + 29, 21, "#4851B0");
    text(ctx, "Upload a manuscript", 128, y + 34, F.body(600, 15), "#4851B0");
    tabBar(ctx, 1);
  },

  analysis(ctx) {
    bg(ctx);
    statusBar(ctx);
    backRow(ctx);
    text(ctx, "Here's what", 20, 116, F.display(800, 30), C.ink, { ls: -1 });
    text(ctx, "we understood.", 20, 147, F.display(800, 30), C.ink, { ls: -1 });
    para(ctx, "The panel asks questions from this. Fix anything that's off.", 20, 176, 300, 20, F.body(400, 13.5), C.inkMuted);
    const cards = [
      { t: "OBJECTIVES", b: "Build an AI mock panel that reads the manuscript and asks adaptive defense questions." },
      { t: "METHOD", b: "Descriptive-developmental design; 30 respondents; ISO 25010 usability survey.", low: true },
      { t: "SCOPE", b: "Android, English, BSIT capstone students at PMFTCI." },
      { t: "KEY CLAIMS", b: "Practice with a spoken panel raises defense readiness." },
    ];
    let y = 214;
    for (const c of cards) {
      ctx.font = F.body(400, 14);
      const lines = Math.ceil(ctx.measureText(c.b).width / 280) || 1;
      const h = 52 + lines * 20;
      rr(ctx, 20, y, 320, h, 22, C.sand);
      if (c.low) {
        ctx.strokeStyle = C.amber;
        ctx.lineWidth = 2;
        rr(ctx, 20, y, 320, h, 22);
        ctx.stroke();
        rr(ctx, 244, y + 12, 78, 22, 10, C.amberWash);
        text(ctx, "AI unsure", 283, y + 27, F.body(600, 11), C.amberInk, { align: "center" });
      } else {
        rr(ctx, 280, y + 10, 44, 28, 14, C.paper);
        text(ctx, "Edit", 302, y + 28, F.body(600, 12), C.ink, { align: "center" });
      }
      label(ctx, c.t, 36, y + 29);
      para(ctx, c.b, 36, y + 54, 284, 20, F.body(400, 14), C.ink);
      y += h + 8;
    }
    rr(ctx, 20, 680, 320, 58, 29, C.ink);
    text(ctx, "Looks right", 180, 714, F.body(600, 16), C.paper, { align: "center" });
  },

  setup(ctx) {
    bg(ctx);
    statusBar(ctx);
    backRow(ctx);
    text(ctx, "Which defense", 20, 116, F.display(800, 30), C.ink, { ls: -1 });
    text(ctx, "today?", 20, 147, F.display(800, 30), C.ink, { ls: -1 });
    rr(ctx, 20, 162, 236, 36, 18, C.sand);
    icon(ctx, "category", 32, 180, 16, C.duskIcon);
    text(ctx, "Domain: Information Tech.", 54, 185, F.body(500, 12.5), C.ink);
    const modes = [
      { t: "Title defense", d: "Is the problem worth solving?", i: "lightbulb" },
      { t: "Pre-Oral", d: "Methods, design, and readiness to build.", i: "check_circle", on: true },
      { t: "Final defense", d: "Results, testing, and conclusions.", i: "workspace_premium" },
    ];
    let y = 216;
    for (const m of modes) {
      rr(ctx, 20, y, 320, 70, 22, m.on ? C.ink : C.sand);
      const fg = m.on ? C.paper : C.ink;
      text(ctx, m.t, 36, y + 31, F.display(700, 17), fg);
      ctx.globalAlpha = 0.75;
      text(ctx, m.d, 36, y + 51, F.body(400, 12.5), fg);
      ctx.globalAlpha = 1;
      icon(ctx, m.i, 322, y + 35, 22, fg, "right");
      y += 78;
    }
    const seg = (title, items, on, yy) => {
      label(ctx, title, 20, yy);
      rr(ctx, 20, yy + 10, 320, 50, 16, C.sand);
      const w = 312 / items.length;
      items.forEach((it, i) => {
        if (i === on) {
          ctx.save();
          ctx.shadowColor = "rgba(42,36,32,0.14)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          rr(ctx, 24 + i * w, yy + 14, w, 42, 12, C.paper);
          ctx.restore();
        }
        text(ctx, it, 24 + i * w + w / 2, yy + 40, F.body(500, 14), C.ink, { align: "center" });
      });
    };
    seg("PANELISTS", ["1", "2", "3"], 2, 470);
    seg("LENGTH", ["10 min", "15 min", "20 min"], 1, 548);
    rr(ctx, 20, 680, 320, 58, 29, C.ink);
    text(ctx, "Continue to mic check", 180, 714, F.body(600, 16), C.paper, { align: "center" });
  },

  session: (ctx, t) => session(ctx, t, false),
  flag: (ctx, t) => session(ctx, t, true),

  results(ctx) {
    bg(ctx);
    statusBar(ctx);
    backRow(ctx, "close");
    text(ctx, "Pre-Oral · Oct 9", 340, 64, F.body(500, 12), C.muted, { align: "right" });
    blob(ctx, 20, 92, 110, 96, C.dusk);
    text(ctx, "70", 75, 157, F.display(800, 46), C.paper, { align: "center", ls: -1.8 });
    text(ctx, "Nearly", 146, 132, F.display(800, 28), C.ink, { ls: -1 });
    text(ctx, "ready.", 146, 160, F.display(800, 28), C.ink, { ls: -1 });
    text(ctx, "70–84 band", 146, 180, F.body(400, 12), C.muted);
    para(ctx, "Nice recovery on question 2. Next time, state your sample size first.", 20, 222, 320, 22, F.body(400, 14.5), C.inkSoft);
    text(ctx, "Rubric 72 − consistency 2 × coverage 4/4 = 70", 20, 276, F.mono(400, 11), C.muted);
    [["18:42", "length"], ["4", "answered"], ["1", "contradiction"]].forEach(([v, l], i) => {
      const x = 20 + i * 108;
      rr(ctx, x, 290, 104, 56, 16, C.sand);
      text(ctx, v, x + 12, 316, F.mono(500, 16), C.ink);
      text(ctx, l, x + 12, 334, F.body(400, 11), C.muted);
    });
    label(ctx, "CONTRADICTIONS", 20, 384);
    rr(ctx, 20, 396, 320, 158, 22, C.sand);
    text(ctx, "Sample size · Q2", 36, 424, F.body(600, 13), C.ink);
    rr(ctx, 244, 410, 80, 24, 12, C.amberWash);
    icon(ctx, "error", 254, 422, 14, C.amberInk);
    text(ctx, "Medium", 272, 426, F.body(600, 11), C.amberInk);
    const quote = (x, lab, a, mark, b) => {
      rr(ctx, x, 444, 140, 96, 14, C.paper);
      text(ctx, lab, x + 10, 462, F.mono(500, 9.5), C.muted);
      text(ctx, a, x + 10, 484, F.body(400, 13), C.ink);
      ctx.font = F.body(400, 13);
      const mw = ctx.measureText(mark).width;
      rr(ctx, x + 8, 490, mw + 4, 19, 4, C.amberMark);
      text(ctx, mark, x + 10, 504, F.body(400, 13), C.ink);
      text(ctx, b, x + 10, 524, F.body(400, 13), C.ink);
    };
    quote(36, "YOU SAID", "“…tested it with", "about fifty users", "”");
    quote(184, "CH. 3, P. 34", "“…involving", "thirty (30)", "respondents.”");
    label(ctx, "RUBRIC", 20, 592);
    rr(ctx, 20, 604, 320, 140, 22, C.sand);
    [["Content", 4], ["Methodology", 3], ["Delivery", 4], ["Consistency", 3]].forEach(([n, s], i) => {
      const y = 630 + i * 30;
      text(ctx, n, 36, y, F.body(500, 13), C.ink);
      text(ctx, `${s}/5`, 324, y, F.mono(500, 13), C.ink, { align: "right" });
      rr(ctx, 36, y + 7, 288, 6, 3, C.paper);
      rr(ctx, 36, y + 7, (288 * s) / 5, 6, 3, C.dusk);
    });
  },
};

function tabBar(ctx, on) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 690, W, 70);
  ctx.fillStyle = "rgba(42,36,32,0.08)";
  ctx.fillRect(0, 690, W, 1);
  ["home", "folder", "history", "person"].forEach((n, i) => {
    const x = 45 + i * 90;
    if (i === on) rr(ctx, x - 28, 704, 56, 32, 16, C.duskTint);
    icon(ctx, n, x, 720, 22, i === on ? C.duskInk : C.muted, "center");
  });
}

const ANIMATED = new Set(["session", "flag"]);

// Fonts must be ready before drawing, or the canvas bakes in fallbacks and raw ligature names.
async function fontsReady() {
  await Promise.all([
    document.fonts.load(F.display(800, 30)),
    document.fonts.load(F.display(700, 17)),
    document.fonts.load(F.body(400, 14)),
    document.fonts.load(F.body(500, 14)),
    document.fonts.load(F.body(600, 14)),
    document.fonts.load(F.mono(500, 12)),
    document.fonts.load(F.mono(400, 12)),
    document.fonts.load(F.icon(24), "mic"),
  ]).catch(() => {});
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Screen id → screenshot of the shipped app (2026-10-23).
const SHOTS = {
  home: "home", projects: "projects", analysis: "analysis", setup: "setup", mic: "mic-check", session: "session",
  flag: "session", results: "results", history: "history", consent: "sign-up", privacy: "profile",
};

// Fills the screen with the screenshot, cropping the overflow evenly (cover fit).
function drawShot(ctx, img) {
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k;
  const h = img.height * k;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

export async function createScreens(THREE) {
  const ids = Object.keys(SHOTS);
  const [, mark, ...imgs] = await Promise.all([
    fontsReady(),
    loadImage("assets/deemo-mark.svg"),
    ...ids.map((id) => loadImage(`assets/screens/${SHOTS[id]}.jpg`)),
  ]);
  const shots = new Map(ids.map((id, i) => [id, imgs[i]]).filter(([, img]) => img));
  const cache = new Map();
  let scale = 2;

  // (Re)builds a screen's canvas and texture at the current scale; a new size needs a new GPU texture.
  function build(id) {
    let e = cache.get(id);
    if (e && e.scale === scale) return e;
    const canvas = e?.canvas ?? document.createElement("canvas");
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    e?.texture.dispose();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    if (shots.has(id)) drawShot(ctx, shots.get(id));
    else (DRAW[id] ?? DRAW.splash)(ctx, 0, mark);
    e = { canvas, ctx, texture, scale };
    cache.set(id, e);
    return e;
  }

  return {
    texture: (id) => build(id).texture,
    // Texture pixels per screen point; returns true when it changed (callers re-fetch their textures).
    setScale(next) {
      if (next === scale) return false;
      scale = next;
      return true;
    },
    // Redraws an animated screen; call only for the screen that is showing.
    tick(id, t) {
      if (!ANIMATED.has(id) || shots.has(id)) return;
      const e = build(id);
      DRAW[id](e.ctx, t, mark);
      e.texture.needsUpdate = true;
    },
  };
}
