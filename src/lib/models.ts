/**
 * The Groq models Foundry can cast with.
 *
 * Only models a free or developer key can call. Groq made Llama 3.1 8B and
 * Llama 3.3 70B enterprise-only on 16 Aug 2026 and withdrew Qwen3.6 27B on
 * 14 Sep 2026; asking for any of them now fails with "model does not exist".
 *
 * `maxOutputTokens` is what we ask for, not what we are guaranteed. Groq's
 * per-minute token allowance is account-specific, and it rejects a request
 * outright (413) when prompt + max_completion_tokens exceeds what is left in
 * the current minute. These figures suit a free-tier key; `streamGroq` reads
 * the rate-limit headers and retries smaller when an account has less room, so
 * a paid key is not held back by them.
 */
export type ModelId = (typeof MODELS)[number]["id"];

export const MODELS = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    /** Two or three words; shown inline in the dropdown. */
    tag: "Best quality",
    blurb:
      "120B parameters. The most complete, best art-directed pages — and the slowest to finish. Start here.",
    maxOutputTokens: 6000,
    reasoning: true,
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    tag: "Fastest",
    blurb:
      "20B parameters. Most of the design sense of the 120B in about half the time — the quickest way to try an idea out.",
    maxOutputTokens: 6000,
    reasoning: true,
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen3.8 27B",
    tag: "Preview",
    blurb:
      "27B parameters, from a different family to GPT-OSS — worth a try when those keep giving you the same look. A Groq preview model, so it can be withdrawn at short notice.",
    maxOutputTokens: 6000,
    // Thinking is off unless asked for, which suits streaming a document.
    reasoning: false,
  },
] as const;

export const DEFAULT_MODEL: ModelId = "openai/gpt-oss-120b";

/**
 * Runs Improve and Review. Groq meters tokens per model per minute, so keeping
 * them off the default build model leaves its whole allowance for the page.
 * A production model on purpose: preview models can vanish at short notice.
 */
export const HELPER_MODEL: ModelId = "openai/gpt-oss-20b";

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id);
}

export function isModelId(id: string): id is ModelId {
  return MODELS.some((m) => m.id === id);
}
