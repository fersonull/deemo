import { AppError } from "../../../shared/errors";
import type { Analysis } from "../../manuscripts/domain/manuscript";
import type { AgendaItem } from "../domain/agenda";
import { LOCKED_FIELDS, liveSetup, type PanelSetup } from "../domain/panel";

// Mints a single-use Gemini Live token with the panel setup locked in (addendum B1); the app connects with it directly.
export async function mintLiveToken(
  setup: PanelSetup,
  analysis: Analysis | undefined,
  agenda: AgendaItem[],
  expiresAt: number,
  newSessionUntil: number,
  seat = 0,
) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      newSessionExpireTime: new Date(newSessionUntil).toISOString(),
      expireTime: new Date(expiresAt).toISOString(), // reconnects never extend this round
      bidiGenerateContentSetup: liveSetup(setup, analysis, seat, agenda),
      fieldMask: LOCKED_FIELDS,
    }),
  });
  if (!r.ok) {
    console.error("auth_tokens", r.status, await r.text());
    throw new AppError(502, "Couldn't connect to the AI panel. Please try again.");
  }
  const { name } = (await r.json()) as { name?: unknown };
  if (typeof name !== "string" || !name) throw new AppError(502, "Couldn't connect to the AI panel. Please try again.");
  return name;
}
