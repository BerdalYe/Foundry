import { NextRequest } from "next/server";
import { DEFAULT_MODEL, getModel } from "@/lib/models";
import {
  buildSectionSystemPrompt,
  buildSectionUserPrompt,
  withHouseStyle,
} from "@/lib/prompt";
import { GroqError, completeGroq } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INSTRUCTION = 2000;
const MAX_BLOCK = 40_000;
const MAX_CSS = 8000;

export async function POST(request: NextRequest) {
  let body: {
    instruction?: unknown;
    block?: unknown;
    css?: unknown;
    model?: unknown;
    houseStyle?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  const block = typeof body.block === "string" ? body.block : "";
  const css = typeof body.css === "string" ? body.css.slice(0, MAX_CSS) : "";
  const houseStyle =
    typeof body.houseStyle === "string" ? body.houseStyle : "";

  if (!instruction) {
    return Response.json(
      { error: "Describe what should change in this section." },
      { status: 400 },
    );
  }
  if (instruction.length > MAX_INSTRUCTION) {
    return Response.json(
      { error: `Keep the change under ${MAX_INSTRUCTION} characters.` },
      { status: 400 },
    );
  }
  if (!block || block.length > MAX_BLOCK) {
    return Response.json(
      { error: "That section could not be read." },
      { status: 400 },
    );
  }

  const model = getModel(
    typeof body.model === "string" ? body.model : DEFAULT_MODEL,
  )!;

  // A block is a fraction of a page, so ask for a fraction of the budget —
  // this is the whole point of scoping a change.
  const maxOutputTokens = Math.min(
    model.maxOutputTokens,
    Math.max(1200, Math.ceil((block.length / 3.6) * 1.5) + 500),
  );

  try {
    const raw = await completeGroq({
      model: model.id,
      messages: [
        {
          role: "system",
          content: withHouseStyle(buildSectionSystemPrompt(), houseStyle),
        },
        { role: "user", content: buildSectionUserPrompt(css, block, instruction) },
      ],
      maxOutputTokens,
      reasoningEffort: model.reasoning ? "low" : undefined,
      signal: request.signal,
    });

    const html = tidyBlock(raw);
    if (!/^<(section|header|footer)\b/i.test(html)) {
      return Response.json(
        {
          error:
            "The model did not return a usable section. Try again, or change the whole page instead.",
        },
        { status: 502 },
      );
    }

    return Response.json({ html });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const message =
      error instanceof GroqError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not rewrite that section.";
    return Response.json({ error: message }, { status: 502 });
  }
}

function tidyBlock(value: string): string {
  let text = value.trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");
  // Drop any chatter before the block and after it.
  const start = /<(section|header|footer)\b/i.exec(text);
  if (start && start.index > 0) text = text.slice(start.index);
  const close = /<\/(section|header|footer)\s*>/gi;
  let last: RegExpExecArray | null;
  let end = -1;
  while ((last = close.exec(text)) !== null) end = last.index + last[0].length;
  if (end !== -1) text = text.slice(0, end);
  return text.trim();
}
