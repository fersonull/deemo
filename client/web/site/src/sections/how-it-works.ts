// "How a session works" — a clickable step list driving a changing visual, the same composition language as
// client/web/presentation's slide 10 (.steps / .flow), rebuilt for a page instead of a 1920×1080 stage.
const STEPS = [
  {
    title: "Upload your manuscript",
    detail: "PDF or DOCX, up to 20 MB. The file itself is discarded after reading — only its text ever leaves your device.",
    visual: () => mockDoc(),
  },
  {
    title: "DEEMO reads it",
    detail: "Document Logic Analysis pulls out your title, problem, objectives, methodology and the facts a panel could catch you contradicting — and detects your field, so the panel below is already yours.",
    visual: () => mockSummary(),
  },
  {
    title: "Set up your panel",
    detail: "Stage (Title, Pre-Oral or Final), 1–3 panelists, session length, difficulty. The panel matches your manuscript's field automatically.",
    visual: () => mockSetup(),
  },
  {
    title: "Live session",
    detail: "The panel asks out loud, you answer by voice. Follow-ups stay bounded. A contradiction gets flagged — amber, never red — the moment you say it.",
    visual: () => mockFlag(),
  },
  {
    title: "Your readiness report",
    detail: "A score, rubric breakdown, full transcript and the specific things to fix before the real defense.",
    visual: () => mockScore(),
  },
];

function mockDoc() {
  return `<span class="eyebrow"><span class="icon" aria-hidden="true">upload_file</span> ReqTrack.pdf · 4.1 MB</span>
    <div class="mock-card"><div class="mock-line" style="width:70%"></div><div class="mock-line" style="width:92%"></div><div class="mock-line" style="width:84%"></div><div class="mock-line" style="width:55%"></div></div>`;
}
function mockSummary() {
  return `<span class="eyebrow"><span class="icon" aria-hidden="true">description</span> Here's what we understood</span>
    <div class="mock-card"><strong style="font:700 13px var(--display)">PROBLEM</strong><div class="mock-line" style="margin-top:8px;width:95%"></div><div class="mock-line" style="width:68%"></div></div>
    <div class="mock-card"><strong style="font:700 13px var(--display)">KEY FACTS</strong><div class="mock-line" style="margin-top:8px;width:80%"></div><div class="mock-line" style="width:60%"></div></div>`;
}
function mockSetup() {
  return `<span class="eyebrow"><span class="icon" aria-hidden="true">tune</span> Pre-Oral · 3 panelists · 15 min</span>
    <div class="mock-card" style="display:flex;gap:10px;flex-wrap:wrap">
      ${["Title", "Pre-Oral", "Final"].map((m, i) => `<span class="chip" aria-pressed="${i === 1}">${m}</span>`).join("")}
    </div>`;
}
function mockFlag() {
  return `<span class="eyebrow"><span class="icon" aria-hidden="true">graphic_eq</span> Live session — Q3</span>
    <div class="mock-card">"How many respondents did your study have?"<div class="mock-line" style="margin-top:12px;width:60%"></div></div>
    <div class="mock-flag"><span class="icon" aria-hidden="true">warning</span> You said 40 — your manuscript says thirty (30) respondents.</div>`;
}
function mockScore() {
  return `<span class="eyebrow"><span class="icon" aria-hidden="true">insights</span> Readiness report</span>
    <div class="mock-score">86</div>
    <div class="mock-line" style="width:70%"></div><div class="mock-line" style="width:50%"></div>`;
}

export function initHowItWorks() {
  const list = document.getElementById("flow-steps")!;
  const visual = document.getElementById("flow-visual")!;

  list.innerHTML = STEPS.map(
    (s, i) => `<li class="${i === 0 ? "is-on" : ""}">
      <button type="button" data-step="${i}">
        <span class="num">${i + 1}</span>
        <span><strong>${s.title}</strong><small><span>${s.detail}</span></small></span>
      </button>
    </li>`,
  ).join("");

  function show(i: number) {
    list.querySelectorAll("li").forEach((li, idx) => li.classList.toggle("is-on", idx === i));
    visual.innerHTML = STEPS[i]!.visual();
  }

  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-step]");
    if (!btn) return;
    show(Number(btn.dataset.step));
  });

  show(0);
}
