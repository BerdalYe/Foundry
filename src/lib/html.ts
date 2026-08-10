/**
 * Models are told to emit a bare HTML document, and mostly they do. This is the
 * belt-and-braces layer that copes when they wrap it in a code fence, chat
 * about it first, or leave a reasoning block in front.
 */

const DOC_START = /<!doctype\s+html|<html[\s>]/i;
/** Longest tail we hold back so a trailing ``` never reaches the preview. */
const TAIL = 8;
/** If no document has started by here, give up filtering and pass it through. */
const PREAMBLE_LIMIT = 8000;

export class HtmlExtractor {
  private started = false;
  private buffer = "";
  private tail = "";
  private gaveUp = false;

  /** Feed a raw model chunk; returns the text safe to show right now. */
  push(chunk: string): string {
    if (this.started) {
      const combined = this.tail + chunk;
      this.tail = combined.slice(-TAIL);
      return combined.slice(0, -TAIL || undefined);
    }

    this.buffer += chunk;

    // A reasoning block can legitimately contain "<html"; wait it out.
    if (this.buffer.includes("<think>") && !this.buffer.includes("</think>")) {
      return "";
    }

    const match = DOC_START.exec(this.buffer);
    if (match) {
      this.started = true;
      const doc = this.buffer.slice(match.index);
      this.buffer = "";
      this.tail = doc.slice(-TAIL);
      return doc.slice(0, -TAIL || undefined);
    }

    if (this.buffer.length > PREAMBLE_LIMIT && !this.gaveUp) {
      this.gaveUp = true;
      this.started = true;
      const flushed = this.buffer;
      this.buffer = "";
      this.tail = flushed.slice(-TAIL);
      return flushed.slice(0, -TAIL || undefined);
    }

    return "";
  }

  /** Flush whatever is still held back once the stream ends. */
  end(): string {
    const rest = (this.started ? "" : this.buffer) + this.tail;
    this.buffer = "";
    this.tail = "";
    return rest.replace(/```\s*$/, "");
  }
}

/** Final tidy-up once a full document has arrived. */
export function finalizeHtml(raw: string): string {
  let html = raw.trim();
  html = html.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");

  const start = DOC_START.exec(html);
  if (start && start.index > 0) html = html.slice(start.index);

  const close = html.toLowerCase().lastIndexOf("</html>");
  if (close !== -1) html = html.slice(0, close + "</html>".length);

  return html.trim();
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

/**
 * The document's <title> is markup, so it arrives escaped. Titles are rendered
 * as React text, which would otherwise show a literal "&amp;".
 */
export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** A short, human name for a build, taken from the document's own <title>. */
export function deriveTitle(html: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = decodeEntities(match?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (title) return title.slice(0, 70);
  const words = fallback.replace(/\s+/g, " ").trim().slice(0, 60);
  return words || "Untitled site";
}

/** Filename-safe slug for the download button. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "foundry-site"
  );
}
