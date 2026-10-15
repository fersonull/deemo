# DEEMO — product context

**What it is.** An Android app where an AI panel reads a BSIT student's capstone manuscript, asks defense questions out loud, flags when the spoken answer contradicts the paper, and scores the session against the rubric. Modes: Title, Pre-Oral, Final defense.

**Who uses it.** 4th-year BSIT students (18+) preparing for their capstone defense; advisers see exported reports. Users are nervous, rehearsing alone, often at night on a mid-range Android phone.

**Tone.** Calm, credible, warm. A patient panel that has read your paper, not a gamified coach. No red during a session; amber marks contradictions; gold is only the Premium badge.

**Visual world (pinned).** Warm paper background, ink text, "dusk" indigo primary; Bricolage Grotesque display, DM Sans body, DM Mono for timers and data, Material Symbols Rounded icons; the owl blob mark. Tokens: `client/mobile/Deemo/src/colors.ts`, `theme.ts`. Light only.

**Surfaces.**
- App (`client/mobile/Deemo`) — Operate.
- Defense deck (`client/web/presentation`) — Persuade, presenter-driven: the group presents DEEMO to their capstone panel on a projector. Each slide is a panel question; one 3D phone travels between slides.

**Out of scope.** Plagiarism, grammar, citation or fact checks, emotion recognition, multilingual, adviser dashboard.
