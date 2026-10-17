import { z } from "zod";

export const PushTokenInput = z.object({ token: z.string().trim().min(20).max(512) });

// The notification shows the start of the message; the full text is one tap away in the app.
export const pushBody = (body: string) => {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157).trimEnd()}…` : flat;
};

// Tokens FCM says will never work again (the app was uninstalled or the token rotated), by position in the batch.
const GONE = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
export const staleTokens = (tokens: string[], responses: { success: boolean; error?: { code: string } }[]) =>
  tokens.filter((_, i) => !responses[i]?.success && GONE.has(responses[i]?.error?.code ?? ""));
