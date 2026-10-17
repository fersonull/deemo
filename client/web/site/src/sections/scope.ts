// "What DEEMO is / isn't" — straight from the plan's Out of Scope list (docs/DEEMO_Mobile_App_Plan.md §5) and the
// defense deck's own "It is / It isn't" slide. The uninventable-claims guardrail, made visible as credibility.
const IS = [
  "A practice tool, grounded in your own manuscript",
  "Built for any course — not just BSIT",
  "A voice session with real follow-ups and a contradiction check",
  "Private: your audio is never stored, only the text transcript",
];
const ISNT = [
  "Official grading — your score carries no academic weight",
  "A replacement for your real panel or your adviser",
  "Plagiarism, grammar or citation checking",
  "Available offline, or in a language other than English",
];

export function initScope() {
  const el = document.getElementById("scope-cols")!;
  el.innerHTML = `
    <div>
      <h3>DEEMO is</h3>
      <ul>${IS.map((t) => `<li>${t}</li>`).join("")}</ul>
    </div>
    <div class="is-not">
      <h3>DEEMO isn't</h3>
      <ul>${ISNT.map((t) => `<li>${t}</li>`).join("")}</ul>
    </div>`;
}
