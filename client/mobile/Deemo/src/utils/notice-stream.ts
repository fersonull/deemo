// SSE frames may split across arbitrary byte chunks, including a CRLF boundary.
export function noticeFrames(onSync: () => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer = (buffer + chunk).replace(/\r\n/g, "\n");
    if (buffer.length > 8192) throw new Error("Notice stream frame too large.");
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (frame.split("\n").some((line) => line === "data: sync")) onSync();
    }
  };
}
