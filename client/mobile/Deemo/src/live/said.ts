// Whether the panel already said a question out loud this turn: most of the question's meaningful words appear in
// what it has spoken since the student's turn ended. The model sometimes speaks first and calls ask_question after;
// approving that call with "say it now" made it ask the same question twice.

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

export function alreadySaid(spoken: string, question: string) {
  const asked = [...new Set(words(question))];
  if (asked.length < 3) return false;
  const heard = new Set(words(spoken));
  return asked.filter((w) => heard.has(w)).length / asked.length >= 0.7;
}
