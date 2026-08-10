import { decodeEntities } from "@/lib/html";

/**
 * Finds the top-level blocks of a generated page so a change can be scoped to
 * one of them.
 *
 * Deliberately string-based rather than DOM-based: the section has to be
 * swapped back into the exact source text afterwards, and round-tripping
 * through DOMParser would reformat the whole document. Working on offsets means
 * everything outside the chosen block is untouched, byte for byte.
 */
export type PageSection = {
  /** Position in the document, 0-based. */
  index: number;
  tag: string;
  id: string | null;
  /** Human label, taken from the block's first heading. */
  label: string;
  start: number;
  end: number;
  html: string;
};

const BLOCK_TAG = /<(\/?)(header|section|footer)\b[^>]*>/gi;
const HEADING = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i;
const ID_ATTR = /\bid\s*=\s*["']([^"']+)["']/i;

export function listSections(html: string): PageSection[] {
  if (!html) return [];

  const sections: PageSection[] = [];
  let depth = 0;
  let start = -1;
  let tag = "";

  BLOCK_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = BLOCK_TAG.exec(html)) !== null) {
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();

    if (!closing) {
      // Only the outermost block is offered; nested ones move with their parent.
      if (depth === 0) {
        start = match.index;
        tag = name;
      }
      depth += 1;
      continue;
    }

    if (depth === 0) continue; // Stray close tag; ignore.
    depth -= 1;

    if (depth === 0 && start !== -1) {
      const end = match.index + match[0].length;
      const block = html.slice(start, end);
      sections.push({
        index: sections.length,
        tag,
        id: ID_ATTR.exec(block)?.[1] ?? null,
        label: labelFor(block, tag, sections.length),
        start,
        end,
        html: block,
      });
      start = -1;
    }
  }

  return sections;
}

function labelFor(block: string, tag: string, index: number): string {
  const heading = HEADING.exec(block)?.[1];
  if (heading) {
    const text = decodeEntities(heading.replace(/<[^>]*>/g, ""))
      .replace(/\s+/g, " ")
      .trim();
    if (text) return text.slice(0, 40);
  }
  if (tag === "header") return "Header";
  if (tag === "footer") return "Footer";
  return `Section ${index + 1}`;
}

/** Swaps one block for a new one, leaving the rest of the document alone. */
export function replaceSection(
  html: string,
  section: Pick<PageSection, "start" | "end">,
  replacement: string,
): string {
  return html.slice(0, section.start) + replacement + html.slice(section.end);
}

/**
 * The page's CSS, so a regenerated block matches the rest. Capped — a whole
 * stylesheet would defeat the point of a cheap, scoped request.
 */
export function styleContext(html: string, limit = 5000): string {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  if (styles.length <= limit) return styles.trim();

  // Keep the custom properties — they carry the palette — plus a leading slice.
  const root = /:root\s*\{[\s\S]*?\}/.exec(styles)?.[0] ?? "";
  return `${root}\n${styles.slice(0, Math.max(0, limit - root.length))}`.trim();
}
