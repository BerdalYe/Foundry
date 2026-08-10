export type GenerateEvent =
  | { t: "start"; model?: string }
  | { t: "chunk"; v: string }
  | { t: "thinking"; v: string }
  | { t: "error"; v: string }
  | { t: "done" };

/**
 * Reads a newline-delimited JSON stream, handing each complete event to
 * `onEvent`. Partial lines are held until the rest arrives.
 */
export async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: GenerateEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as GenerateEvent);
      } catch {
        /* a truncated frame is not worth aborting the stream for */
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as GenerateEvent);
    } catch {
      /* ignore */
    }
  }
}
