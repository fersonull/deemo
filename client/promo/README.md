# DEEMO promo video

A ~55 s, 1920×1080 motion-graphics promo made with [Remotion](https://www.remotion.dev). The voiceover, sound effects and music come from ElevenLabs. It uses the app's tokens and fonts, plus the Deemo owl and panel-face SVGs copied from `client/web/site/src/`.

```bash
bun install
bun run dev      # Remotion Studio, live preview
bun run audio    # (re)generate audio with ElevenLabs; needs ELEVENLABS_API_KEY in .env
bun run render   # → out/deemo-promo.mp4
```

- **Script:** `src/script.ts` holds the spoken lines, the SFX prompts and the music prompt.
  - After editing a line, delete `public/audio/vo-<id>.mp3` (or pass `--force`), then run `bun run audio`.
  - Each scene is sized to its voiceover. `src/audio.json` records the measured lengths.
- **Scenes:** `src/scenes/`, in this order:
  1. hook
  2. meet
  3. upload
  4. panel (the real course→panel lineup)
  5. ask
  6. flag (amber, never red)
  7. report (the real rubric)
  8. cta
- **Timeline:** `src/Promo.tsx` sequences the scenes with transitions and plays the music bed underneath.
- **Music:** the Music API needs a paid ElevenLabs plan. On a free plan the script falls back to a 30 s looping bed from the sound-effects model.
- **Audio in git:** the generated audio in `public/audio/` is committed, so rendering doesn't need the key.
