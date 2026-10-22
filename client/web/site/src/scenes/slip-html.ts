import type { Slip } from "../content";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// The DOM slip (base.css `.slip`), for the hero before or without WebGL.
export const slipInner = (s: Slip) =>
  `<p class="slip__who"><span><b>${esc(s.name)}</b> <span class="slip__role">${esc(s.role)}</span></span><span class="slip__stage">${esc(s.stage)}</span></p>
   <p class="slip__q">${esc(s.q)}</p>
   <p class="slip__src">Sample paper: ReqTrack</p>`;

// The back of an answered slip: the follow-up that panelist would ask next.
export const backInner = (s: Slip) =>
  `<p class="slip__who"><span><b>${esc(s.name)}</b> <span class="slip__role">${esc(s.role)}</span></span><span class="slip__stage">${esc(s.stage)}</span></p>
   <p class="slip__lead">If you answer, ${esc(s.name)} follows up:</p>
   <p class="slip__q">${esc(s.follow)}</p>`;
