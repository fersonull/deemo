// Avatar letters: first and last name initials, or the start of the email.
export function initials(name: string | null, email: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length) return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
  return (email ?? "?").slice(0, 2).toUpperCase();
}
