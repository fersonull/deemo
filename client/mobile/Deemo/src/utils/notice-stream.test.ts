import { expect, test } from "bun:test";
import { noticeFrames } from "./notice-stream";

test("fragmented SSE frames, CRLF and heartbeats do not lose or duplicate updates", () => {
  let calls = 0;
  const push = noticeFrames(() => calls++);
  for (const chunk of [": keepalive\r", "\n\r\n", "data: sy", "nc\r", "\n\r", "\n", "data: sync\n\ndata: sync\n\n"]) push(chunk);
  expect(calls).toBe(3);
});

test("unbounded incomplete frames fail rather than retaining memory", () => {
  const push = noticeFrames(() => {});
  expect(() => push("x".repeat(8193))).toThrow("too large");
});
