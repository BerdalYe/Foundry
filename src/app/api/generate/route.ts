import { NextRequest } from "next/server";
import { DEFAULT_MODEL, getModel } from "@/lib/models";
import {
  buildRefineSystemPrompt,
  buildRefineUserPrompt,
  buildSystemPrompt,
  withHouseStyle,
} from "@/lib/prompt";
import { GroqError, streamGroq, type GroqMessage } from "@/lib/groq";
import { HtmlExtractor } from "@/lib/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT = 4000;
const MAX_HTML = 200_000;

type GenerateBody = {
  prompt?: unknown;
  model?: unknown;
  mode?: unknown;
  currentHtml?: unknown;
  houseStyle?: unknown;
};

/** Newline-delimited JSON so the client can read events without an SSE parser. */
function event(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload) + "\n");
}

export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json(
      { error: "Describe the site you want before generating." },
      { status: 400 },
    );
  }
  if (prompt.length > MAX_PROMPT) {
    return Response.json(
      { error: `Keep the description under ${MAX_PROMPT} characters.` },
      { status: 400 },
    );
  }

  const mode = body.mode === "refine" ? "refine" : "create";
  const currentHtml =
    typeof body.currentHtml === "string" ? body.currentHtml : "";

  if (mode === "refine") {
    if (!currentHtml) {
      return Response.json(
        { error: "There is no page to refine yet." },
        { status: 400 },
      );
    }
    if (currentHtml.length > MAX_HTML) {
      return Response.json(
        { error: "This page has grown too large to refine. Start a new build." },
        { status: 400 },
      );
    }
  }

  const modelId = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
  const model = getModel(modelId) ?? getModel(DEFAULT_MODEL)!;

  const houseStyle =
    typeof body.houseStyle === "string" ? body.houseStyle : "";

  const messages: GroqMessage[] =
    mode === "refine"
      ? [
          {
            role: "system",
            content: withHouseStyle(buildRefineSystemPrompt(), houseStyle),
          },
          {
            role: "user",
            content: buildRefineUserPrompt(currentHtml, prompt),
          },
        ]
      : [
          {
            role: "system",
            content: withHouseStyle(buildSystemPrompt(), houseStyle),
          },
          { role: "user", content: prompt },
        ];

  // A refine returns a document about the size of the one it was given, so ask
  // for that rather than the model's ceiling — a smaller request is far less
  // likely to hit Groq's per-minute token limit.
  const maxOutputTokens =
    mode === "refine"
      ? Math.min(
          model.maxOutputTokens,
          Math.max(1500, Math.ceil((currentHtml.length / 3.6) * 1.2) + 400),
        )
      : model.maxOutputTokens;

  const extractor = new HtmlExtractor();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (!closed) controller.enqueue(chunk);
      };

      try {
        safeEnqueue(event({ t: "start", model: model.id }));

        for await (const part of streamGroq({
          model: model.id,
          messages,
          maxOutputTokens,
          reasoningEffort: model.reasoning ? "low" : undefined,
          signal: request.signal,
        })) {
          if (part.kind === "reasoning") {
            safeEnqueue(event({ t: "thinking", v: part.text }));
            continue;
          }
          const visible = extractor.push(part.text);
          if (visible) safeEnqueue(event({ t: "chunk", v: visible }));
        }

        const rest = extractor.end();
        if (rest) safeEnqueue(event({ t: "chunk", v: rest }));
        safeEnqueue(event({ t: "done" }));
      } catch (error) {
        // An aborted request is the user pressing Stop, not a failure.
        if (request.signal.aborted) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        const message =
          error instanceof GroqError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Generation failed unexpectedly.";
        safeEnqueue(event({ t: "error", v: message }));
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
