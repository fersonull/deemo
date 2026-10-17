const FAQ: { q: string; a: string }[] = [
  { q: "Does this replace my real defense panel?", a: "No — it's practice. Your score carries no official academic weight; think of it as rehearsal before the real thing, not a substitute for it." },
  { q: "Is my data private?", a: "Your manuscript and voice are processed by Google's Gemini (paid tier) to run the panel. Raw audio is never recorded — only the text transcript is kept, and you can delete everything from the app at any time." },
  { q: "Which courses does it support?", a: "Any. DEEMO detects your manuscript's field and builds the right panel for it. BSIT and BSCS also get a technical panelist tuned to the project's IT field — every other course gets a field-matched expert too." },
  { q: "Is it free?", a: "Yes — one manuscript, five practice sessions a day, one panelist, Title and Pre-Oral defense. Premium removes the daily limit and adds Final Defense mode, up to three panelists and the full report." },
  { q: "What platforms does it run on?", a: "Android, for now, in English. It needs an internet connection — there's no offline mode, since the live panel runs through Gemini." },
];

export function initFaq() {
  const el = document.getElementById("faq-list")!;
  el.innerHTML = FAQ.map(
    (item, i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
      <summary>${item.q}<span class="icon" aria-hidden="true">add</span></summary>
      <p>${item.a}</p>
    </details>`,
  ).join("");
}
