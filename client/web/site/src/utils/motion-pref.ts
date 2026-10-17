// Mirrors the app's useReducedMotion() discipline: one place every section checks before animating.
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
