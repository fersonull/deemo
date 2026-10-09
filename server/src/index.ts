import express from "express";

import { LIVE_MODEL, LOCKED_FIELDS, liveSetup, parseSetup } from "./panel";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Mints a single-use Gemini Live token with the panel setup locked in (addendum B1).
// The app calls this before every connect, including reconnects (the resumption handle carries the session).
// ponytail: no auth or quota yet; add requireFirebaseAuth + tier checks when sign-in lands.
app.post("/live/token", async (req, res) => {
  const setup = parseSetup(req.body);
  if (!setup) return void res.status(400).json({ error: "invalid setup" });

  const now = Date.now();
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      expireTime: new Date(now + (setup.minutes + 30) * 60_000).toISOString(), // session plus pauses
      bidiGenerateContentSetup: liveSetup(setup),
      fieldMask: LOCKED_FIELDS,
    }),
  });
  if (!r.ok) {
    console.error("auth_tokens", r.status, await r.text());
    return void res.status(502).json({ error: "token mint failed" });
  }
  const { name } = (await r.json()) as { name: string };
  res.json({ token: name, model: LIVE_MODEL });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`DEEMO server on :${port}`));
