// Sign-up checks done on the phone before Firebase sees anything (Firebase wants 6+ characters too).

export const MIN_PASSWORD = 6;

// What's wrong with the confirmation, if anything. Silent until the student has typed into it, and while what
// they've typed still matches the start of the password (they're mid-way, not wrong).
export function confirmProblem(password: string, confirm: string): string | null {
  if (!confirm || password === confirm) return null;
  if (confirm.length < password.length && password.startsWith(confirm)) return null;
  return "Passwords don't match.";
}

// The name Deemo greets the student by and teammates see in a group: single-spaced, at most 60 characters (the
// server's limit for group member names).
export const MAX_NAME = 60;
export const cleanName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);

export function canCreate(name: string, email: string, password: string, confirm: string) {
  return !!cleanName(name) && !!email.trim() && password.length >= MIN_PASSWORD && password === confirm;
}
