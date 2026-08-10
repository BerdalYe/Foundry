import { NextRequest } from "next/server";
import { GroqError, completeGroq } from "@/lib/groq";
import {
  buildEnhanceRefineUserPrompt,
  buildEnhanceSystemPrompt,
} from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT = 4000;
const MAX_OUTPUT_TOKENS = 500;
/**
 * How much of the page the enhancer gets to see. Enough to name real sections;
 * short enough that the request stays inside a minute's token allowance.
 */
const MAX_CONTEXT_CHARS = 14_000;

/**
 * Deliberately not the model the page is generated with. Groq meters tokens per
 * model per minute, so enhancing on a different model leaves the build model's
 * whole allowance intact for the page itself.
 */
const ENHANCER_MODEL = "llama-3.3-70b-versatile";

export async function POST(request: NextRequest) {
  let body: { prompt?: unknown; mode?: unknown; currentHtml?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const mode = body.mode === "refine" ? "refine" : "create";
  const currentHtml =
    typeof body.currentHtml === "string"
      ? body.currentHtml.slice(0, MAX_CONTEXT_CHARS)
      : "";

  if (prompt.length < 3) {
    return Response.json(
      { error: "Write a few words first." },
      { status: 400 },
    );
  }
  if (prompt.length > MAX_PROMPT) {
    return Response.json(
      { error: `Keep the description under ${MAX_PROMPT} characters.` },
      { status: 400 },
    );
  }

  try {
    const enhanced = await completeGroq({
      model: ENHANCER_MODEL,
      messages: [
        { role: "system", content: buildEnhanceSystemPrompt(mode) },
        {
          role: "user",
          content:
            mode === "refine" && currentHtml
              ? buildEnhanceRefineUserPrompt(currentHtml, prompt)
              : prompt,
        },
      ],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Low temperature: this should sharpen the request, not reimagine it.
      temperature: 0.4,
      signal: request.signal,
    });

    const cleaned = tidy(enhanced);

    if (cleaned.length < prompt.length) {
      return Response.json(
        { error: "The rewrite came back thinner than what you wrote." },
        { status: 502 },
      );
    }

    return Response.json({ prompt: cleaned });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const message =
      error instanceof GroqError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not rewrite that description.";
    return Response.json({ error: message }, { status: 502 });
  }
}

/** Strips the wrappers models add even when told not to. */
function tidy(value: string): string {
  let text = value.trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  text = text.replace(
    /^(?:sure|certainly|here(?:'s| is)[^:\n]*|brief)\s*[:\-—]\s*/i,
    "",
  );
  // A brief wrapped in matching quotes, which some models cannot resist.
  if (/^["“](.|\n)*["”]$/.test(text)) text = text.slice(1, -1);
  return text.trim();
}
