// Free vs Premium — the real numbers from server/src/modules/identity/domain/plan.ts. No pricing shown: Premium is
// a simulated upgrade in the app (no real payments), so the site never implies a checkout.
const FREE = ["One manuscript", "Five practice sessions a day", "One panelist", "Sessions up to 30 minutes", "Title and Pre-Oral defense"];
const PREMIUM = ["Unlimited manuscripts", "Unlimited practice sessions", "Up to three panelists", "Sessions up to 60 minutes", "Every defense stage, including Final", "The full readiness report"];

export function initPlans() {
  const el = document.getElementById("plans-grid")!;
  el.innerHTML = `
    <div class="plan-card plan-card--free">
      <div><div class="plan-card__name">Free</div><div class="plan-card__price">Everything you need to start rehearsing</div></div>
      <ul>${FREE.map((t) => `<li><span class="icon" aria-hidden="true">check</span>${t}</li>`).join("")}</ul>
    </div>
    <div class="plan-card plan-card--premium">
      <div><div class="plan-card__name">Premium</div><div class="plan-card__price">For the week before your real defense</div></div>
      <ul>${PREMIUM.map((t) => `<li><span class="icon" aria-hidden="true">check</span>${t}</li>`).join("")}</ul>
    </div>`;
}
