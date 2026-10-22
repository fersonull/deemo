# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

The app is Android only. The marketing site, web admin and defense deck are web surfaces, and the promo is a rendered video.

## Users

Students of any course who are preparing a research defense (Title, Pre-Oral or Final) and are 18 or older. They're nervous and rehearse alone, often at night on a mid-range Android phone. Advisers see exported reports. The study's evaluation population is 4th-year BSIT capstone students at PMFTCI.

## Product Purpose

An AI mock panel. It reads the student's manuscript, asks defense questions out loud, follows up, flags when a spoken answer contradicts the paper, and scores the session against a rubric. The readiness arithmetic is done in code; the AI only supplies rubric levels and justifications. Success means the student walks into the real defense having already been asked the hard questions.

## Positioning

A panel that has actually read *your* paper and talks back, profiled for your course (the field expert's title, role and focus change with the course). It isn't a flashcard deck or a chat coach.

## Operating Context

- **Stages:** Title, Pre-Oral and Final defense. The panel works through a fixed agenda built from the manuscript, with follow-ups limited per topic and an Easy/Standard/Hard difficulty.
- **Live sessions:** voice runs phone ⇄ Gemini Live directly, and the student taps when they're done speaking.
- **Plans:** Free is capped at 30 minutes per session and Premium at 60. Premium is simulated (promo code); there are no real payments.

## Capabilities and Constraints

- English only, online only, and no raw audio is stored (transcripts only).
- Raw manuscripts are discarded after text extraction.
- **Out of scope:** plagiarism, grammar, citation or fact checks; emotion recognition; multilingual support; an adviser dashboard.

## Brand Commitments

- **Tone:** calm, credible and warm. A patient panel that has read your paper, not a gamified coach.
- **Colour rules:** no red during a session. Amber marks contradictions. Gold is only the Premium badge.
- **Visual world (pinned):**
  - warm paper background, ink text, "dusk" indigo primary;
  - Bricolage Grotesque display, DM Sans body, DM Mono for timers and data;
  - Material Symbols Rounded icons;
  - the organic blob shape and Deemo, the owl in a mortarboard.
  - Tokens live in `client/mobile/Deemo/src/colors.ts` and `theme.ts`. Light by default, with a warm dark theme chosen in Profile (same roles on night ink; amber still marks contradictions). Character art (Deemo, the panel faces) keeps its light colours in both.

## Surfaces

- **App** (`client/mobile/Deemo`): Operate.
- **Marketing site** (`client/web/site`): Persuade, a scroll story with the 3D phone.
- **Web admin** (`client/web/admin`): Operate, for user lookup and notices.
- **Promo video** (`client/promo`): Persuade, a ~30 s film (Intro → Problem → Use cases → Call to action).
- **Defense deck** (`client/web/presentation`): Persuade, presenter-driven. The group presents DEEMO to their capstone panel on a projector; each slide is a panel question, and one 3D phone travels between slides.

## Evidence on Hand

- **Sample paper:** "ReqTrack" (`SAMPLE_ANALYSIS` in `server/src/modules/practice/domain/agenda.ts`).
- **Course → panel lineup:** `server/src/modules/practice/domain/panel.ts`, ported to `client/web/site/src/panel-data.ts`.
- **Rubric:** content, methodology, consistency, delivery and Q&A.
- **Absent:** there are no testimonials, usage numbers or institutional endorsements. Don't fabricate any.

## Product Principles

1. The panel must sound like it read the paper. Specific beats generic.
2. Calm under pressure: the product lowers anxiety, it never adds alarm.
3. Show the real logic. Marketing reuses the app's actual lineup, rubric and sample paper.
4. Honest scoring: numbers come from code, words from the AI.
