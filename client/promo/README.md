# DEEMO promo video

A ~26 s, 1920×1080 continuous motion-graphics promo (one shot, carried by a CSS-3D phone) made with [Remotion](https://www.remotion.dev). The voiceover, sound effects and music come from ElevenLabs. It uses the app's tokens and fonts, plus the Deemo owl and panel-face SVGs copied from `client/web/site/src/`.

```bash
bun install
bun run dev      # Remotion Studio, live preview
bun run audio    # (re)generate audio with ElevenLabs; needs ELEVENLABS_API_KEY in .env
bun run render   # → out/deemo-promo.mp4
```

- **Script:** `src/script.ts` holds the spoken lines, the SFX prompts and the music prompt.
  - After editing a line, delete `public/audio/vo-<id>.mp3` (or pass `--force`), then run `bun run audio`.
  - Each beat stretches to fit its voiceover. `src/audio.json` records the measured lengths.
- **Phone:** `src/phone.tsx` is the 3D phone, and `src/screens.tsx` is what its screen shows on each beat.
- **Timeline:** `src/Promo.tsx` is the whole shot.
  - The phone's path is the `PATH` keyframes.
  - Each beat's world elements fly out of the screen and back.
  - Timing hangs off the beat starts `B` in `src/script.ts`.
- **Music:** the Music API needs a paid ElevenLabs plan. On a free plan the script falls back to a 30 s looping bed from the sound-effects model.
- **Audio in git:** the generated audio in `public/audio/` is committed, so rendering doesn't need the key.
