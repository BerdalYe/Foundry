import "server-only";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Rough enough to size a request; Groq is the authority on the real count. */
const CHARS_PER_TOKEN = 3.6;
/** Headroom for the token estimate being optimistic. */
const SAFETY_TOKENS = 400;
/** Below this there is no point retrying — the page would be a stub. */
const MIN_USEFUL_OUTPUT = 1200;

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqStreamOptions = {
  model: string;
  messages: GroqMessage[];
  maxOutputTokens: number;
  /** Only sent for models that support it (the gpt-oss family). */
  reasoningEffort?: "low" | "medium" | "high";
  signal?: AbortSignal;
};

export class GroqError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

export function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new GroqError(
      "No Groq API key configured. Add GROQ_API_KEY to .env.local and restart the dev server.",
      500,
    );
  }
  return key;
}

export function estimateTokens(messages: GroqMessage[]): number {
  const chars = messages.reduce((total, m) => total + m.content.length, 0);
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

type RateLimits = {
  remainingTokens: number | null;
  limitTokens: number | null;
  resetSeconds: number | null;
};

function readRateLimits(res: Response): RateLimits {
  const num = (name: string) => {
    const raw = res.headers.get(name);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  return {
    remainingTokens: num("x-ratelimit-remaining-tokens"),
    limitTokens: num("x-ratelimit-limit-tokens"),
    resetSeconds: parseDuration(res.headers.get("x-ratelimit-reset-tokens")),
  };
}

/** Groq formats resets as "13.635s" or "1m26.4s". */
function parseDuration(raw: string | null): number | null {
  if (!raw) return null;
  const match = /(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?/.exec(raw.trim());
  if (!match) return null;
  const minutes = Number(match[1] ?? 0);
  const seconds = Number(match[2] ?? 0);
  const total = minutes * 60 + seconds;
  return total > 0 ? Math.ceil(total) : null;
}

/**
 * Sends the request, adapting to whatever token allowance the account has left,
 * and returns a Response that is known to be OK.
 */
async function requestGroq(
  options: GroqStreamOptions & { stream: boolean; temperature?: number },
): Promise<Response> {
  const inputTokens = estimateTokens(options.messages);

  const post = (maxOutputTokens: number) => {
    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
      max_completion_tokens: maxOutputTokens,
      temperature: options.temperature ?? 0.6,
      top_p: 0.9,
      stream: options.stream,
    };
    if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;

    return fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  };

  let res = await post(options.maxOutputTokens);

  // 413 here means "prompt + requested output exceeds what is left of your
  // per-minute token allowance" — not that the prompt is too long. Ask again
  // for exactly what the account has room for.
  if (res.status === 413) {
    const limits = readRateLimits(res);
    const room = (limits.remainingTokens ?? 0) - inputTokens - SAFETY_TOKENS;

    if (room >= MIN_USEFUL_OUTPUT) {
      res = await post(Math.min(options.maxOutputTokens, Math.floor(room)));
    } else {
      throw new GroqError(rateLimitMessage(limits, inputTokens), 413);
    }
  }

  if (res.status === 429) {
    throw new GroqError(rateLimitMessage(readRateLimits(res), inputTokens), 429);
  }

  if (!res.ok || !res.body) {
    throw new GroqError(await readGroqError(res), res.status);
  }

  return res;
}

/** One-shot call for short outputs, where streaming would only add latency. */
export async function completeGroq(
  options: GroqStreamOptions & { temperature?: number },
): Promise<string> {
  const res = await requestGroq({ ...options, stream: false });
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Calls Groq in streaming mode and yields the assistant's visible content,
 * chunk by chunk.
 *
 * Reasoning deltas (gpt-oss) arrive on a separate field and are yielded with
 * `kind: "reasoning"` so the caller can show them as status rather than as
 * part of the document.
 */
export async function* streamGroq(
  options: GroqStreamOptions,
): AsyncGenerator<{ kind: "content" | "reasoning"; text: string }> {
  const res = await requestGroq({ ...options, stream: true });

  const body = res.body;
  if (!body) throw new GroqError("Groq returned an empty response.", 502);

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep any partial tail.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let parsed: GroqStreamChunk;
        try {
          parsed = JSON.parse(payload) as GroqStreamChunk;
        } catch {
          continue; // A malformed frame is not worth failing the whole cast.
        }

        const delta = parsed.choices?.[0]?.delta;
        if (delta?.reasoning) {
          yield { kind: "reasoning", text: delta.reasoning };
        }
        if (delta?.content) {
          yield { kind: "content", text: delta.content };
        }
      }
    }
  }
}

type GroqStreamChunk = {
  choices?: Array<{
    delta?: { content?: string; reasoning?: string };
    finish_reason?: string | null;
  }>;
};

function rateLimitMessage(limits: RateLimits, inputTokens: number): string {
  const wait = limits.resetSeconds;
  const when = wait
    ? `Your allowance refills in about ${wait} second${wait === 1 ? "" : "s"}.`
    : "Wait about a minute for the allowance to refill.";

  const budget = limits.limitTokens
    ? ` This key allows ${limits.limitTokens.toLocaleString()} tokens per minute, and this request needed roughly ${inputTokens.toLocaleString()} just to send.`
    : "";

  return `Groq's per-minute token limit is used up.${budget} ${when} Llama 3.3 70B usually has the most headroom.`;
}

async function readGroqError(res: Response): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: { message?: string } };
      detail = json.error?.message ?? text;
    } catch {
      detail = text;
    }
  } catch {
    /* fall through to the status-based message */
  }

  if (res.status === 401) {
    return "Groq rejected the API key. Check GROQ_API_KEY in .env.local.";
  }
  if (res.status === 404) {
    return "Groq does not recognise that model. Pick a different one.";
  }
  if (res.status >= 500) {
    return "Groq had a problem on its end. Try again in a moment.";
  }
  return detail
    ? `Groq error (${res.status}): ${detail.slice(0, 300)}`
    : `Groq returned ${res.status}.`;
}
