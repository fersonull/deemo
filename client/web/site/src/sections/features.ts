// Chapter 05's live demo: type a number that disagrees with the fixed demo manuscript fact and the app's own
// amber-flag treatment fires; a matching one gets the sage check.
const DEMO_FACT = "Thirty (30) respondents, chosen by purposive sampling.";
const DEMO_NUMBER = 30;

function consistencyDemo(): string {
  return `<div class="consistency-demo">
    <p class="consistency-fact">Your manuscript says: <strong>&ldquo;${DEMO_FACT}&rdquo;</strong></p>
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

export function initConsistencyDemo() {
  const mount = document.getElementById("consistency-demo");
  if (!mount) return;
  mount.innerHTML = consistencyDemo();
  wireConsistencyDemo();
}
