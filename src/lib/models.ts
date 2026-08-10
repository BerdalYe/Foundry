/**
 * The Groq models Foundry can cast with.
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
    tag: "Quick and capable",
    blurb:
      "20B parameters. Most of the design sense of the 120B at roughly half the wait. A good everyday choice.",
    maxOutputTokens: 6000,
    reasoning: true,
  },
  {
    id: "qwen/qwen3.6-27b",
    name: "Qwen3.6 27B",
    tag: "Balanced",
    blurb:
      "27B parameters. Tidy, conventional layouts and dependable CSS. Less adventurous, rarely wrong.",
    maxOutputTokens: 6000,
    reasoning: false,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    tag: "Longest pages",
    blurb:
      "70B parameters, and the largest token allowance of the five — pick it when a page is long enough to get cut off.",
    maxOutputTokens: 8000,
    reasoning: false,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    tag: "Fastest",
    blurb:
      "8B parameters. Returns in seconds, so it is ideal for trying an idea out. Plainer results; expect to refine.",
    maxOutputTokens: 4200,
    reasoning: false,
  },
] as const;

export const DEFAULT_MODEL: ModelId = "openai/gpt-oss-120b";

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id);
}

export function isModelId(id: string): id is ModelId {
  return MODELS.some((m) => m.id === id);
}
