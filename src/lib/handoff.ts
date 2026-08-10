import { DEFAULT_MODEL } from "@/lib/models";

/**
 * Carries the hero prompt from the landing page to the builder.
 *
 * sessionStorage rather than a query string: descriptions are long, and a
 * 2,000-character URL is neither shareable nor pleasant.
 */
const PENDING_KEY = "foundry:pending";

export type PendingBuild = { prompt: string; model: string };

export function setPendingBuild(pending: PendingBuild) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* private mode, or storage full — the builder just opens empty */
  }
}

/** Reads and clears in one go, so a refresh doesn't re-run the build. */
export function takePendingBuild(): PendingBuild | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    const parsed = JSON.parse(raw) as Partial<PendingBuild>;
    if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) return null;
    return {
      prompt: parsed.prompt,
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_MODEL,
    };
  } catch {
    return null;
  }
}
