# DEEMO promo video

A ~27 s, 1920×1080, 60 fps promo made with [Remotion](https://www.remotion.dev), in four acts: Intro → Problem → Use cases → Call to action. The voiceover, sound effects and music come from ElevenLabs. It uses the app's design system: `colors.ts` tokens, Bricolage, DM Sans and DM Mono, raised surfaces and the blob shape. Text is word-by-word kinetic type with iOS-style spring motion. All art is drawn in code: the Deemo owl and the panel faces are ports of the app's components.

```bash
bun install
bun run dev      # Remotion Studio, live preview (:3002)
bun run audio    # (re)generate audio with ElevenLabs; needs ELEVENLABS_API_KEY in .env
bun run render   # → out/deemo-promo.mp4
```

- **Script:** `src/script.ts` holds the spoken lines, the SFX prompts, the music prompt and the scene timing.
  - After editing a line, delete `public/audio/vo-<id>.mp3` (or pass `--force`), then run `bun run audio`.
  - Each scene stretches to fit its voiceover (`MIN` sets a floor). `src/audio.json` records the measured lengths.
  - Scenes overlap by `OVERLAP` frames; the bridges between them happen there.
- **Scenes:** `src/scenes/` holds one file per scene (intro, problem, analysis, setup, panel, live, cta).
- **Phone:** `src/components/phone.tsx` is the CSS-3D phone, and `src/screens.tsx` is what its screen shows (Setup with its flying controls, the live session, the report). Its path through the film is `pose()` in `src/Promo.tsx`.
- **Motion:** `src/motion.ts` holds the springs, easing curves, flight paths and velocity blur.
- **Look:** `src/ui.tsx` holds the app tokens (`C`, keep in step with `client/mobile/Deemo/src/colors.ts`), fonts, `surface()`, `BLOB`, `Words` and the sound helpers. `src/components/backdrop.tsx` is the background.
- **Art:** `src/components/deemo.tsx` and `src/components/panel-face.tsx` are frame-driven ports of the app's owl and panel busts. Keep them in step with the app.
- **Panel scene:** it imports the real course → panel lineup from `client/web/site/src/panel-data.ts`.
- **Music:** the Music API needs a paid ElevenLabs plan. On a free plan the script falls back to a 30 s looping bed from the sound-effects model.
- **Audio in git:** the generated audio in `public/audio/` is committed, so rendering doesn't need the key.
