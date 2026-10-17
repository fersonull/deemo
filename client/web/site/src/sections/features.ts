// Feature cards. "Live Verbal Consistency Checker" is wide and carries a tiny real interaction: type a number that
// disagrees with the fixed demo manuscript fact and watch the app's own amber-flag treatment fire.
type Feature = { icon: string; tile?: "amber" | "sage"; title: string; body: string; wide?: boolean };

const FEATURES: Feature[] = [
  { icon: "description", title: "Document Logic Analysis", body: "DEEMO extracts your title, problem, objectives, methodology, scope and the checkable facts a panel could catch you contradicting — from any course's manuscript." },
  { icon: "groups", title: "A panel built for your field", body: "Your manuscript's detected field decides who questions you and what they press on — not a one-size-fits-all \"technical panelist.\" Try it in the demo above." },
  {
    icon: "fact_check",
    tile: "amber",
    title: "Live Verbal Consistency Checker",
    body: "The panel flags it the moment your spoken answer contradicts your own manuscript — amber, never red. Try it:",
    wide: true,
  },
  { icon: "forum", title: "Bounded follow-up", body: "Up to two follow-ups per topic by default, then the panel moves on — the same discipline a real panel keeps to, enforced in code, not just a prompt." },
  { icon: "record_voice_over", title: "Question-type indicators", body: "Every question is labelled as it's asked — Technical, Methodological, Conceptual or Clarificatory — so you learn to recognise the pattern." },
  { icon: "insights", title: "Readiness analytics", body: "A readiness score, a rubric breakdown, response-time stats and stronger sample answers for every question you missed." },
];

const DEMO_FACT = "Thirty (30) respondents, chosen by purposive sampling.";
const DEMO_NUMBER = 30;

function consistencyDemo(): string {
  return `<div class="consistency-demo">
    <div class="mock-card" style="font:500 13.5px/1.4 var(--body); color:var(--ink-muted)">Your manuscript says: <strong style="color:var(--ink)">&ldquo;${DEMO_FACT}&rdquo;</strong></div>
    <label class="vh" for="consistency-input">Say your answer out loud (type it here)</label>
    <input id="consistency-input" type="text" placeholder="Try answering: “We had forty respondents…”" autocomplete="off" />
    <div class="consistency-result" id="consistency-result" data-state="idle">Type an answer above to see it checked live.</div>
  </div>`;
}

function wireConsistencyDemo() {
  const input = document.getElementById("consistency-input") as HTMLInputElement | null;
  const result = document.getElementById("consistency-result");
  if (!input || !result) return;
  input.addEventListener("input", () => {
    const text = input.value.trim();
    if (!text) {
      result.dataset.state = "idle";
      result.innerHTML = "Type an answer above to see it checked live.";
      return;
    }
    const match = text.match(/\b(\d{1,3})\b/);
    const said = match ? Number(match[1]) : null;
    if (said !== null && said !== DEMO_NUMBER) {
      result.dataset.state = "flag";
      result.innerHTML = `<span class="icon" aria-hidden="true">warning</span> Flagged — you said ${said}, your manuscript says ${DEMO_NUMBER}.`;
    } else {
      result.dataset.state = "ok";
      result.innerHTML = `<span class="icon" aria-hidden="true">check_circle</span> Matches your manuscript — no contradiction.`;
    }
  });
}

function featureCard(f: Feature): string {
  const tile = `<div class="tile${f.tile ? ` tile--${f.tile}` : ""}"><span class="icon" aria-hidden="true">${f.icon}</span></div>`;
  const text = `${tile}<h3>${f.title}</h3><p>${f.body}</p>`;
  if (!f.wide) return `<article class="card feature" data-reveal>${text}</article>`;
  return `<article class="card feature feature--wide" data-reveal><div>${text}</div>${consistencyDemo()}</article>`;
}

export function initFeatures() {
  const grid = document.getElementById("feature-grid")!;
  grid.innerHTML = FEATURES.map(featureCard).join("");
  wireConsistencyDemo();
}
