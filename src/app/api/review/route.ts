import { NextRequest } from "next/server";
import { GroqError, completeGroq } from "@/lib/groq";
import { buildReviewSystemPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** As with the enhancer: a different model, so the build budget is untouched. */
const REVIEW_MODEL = "llama-3.3-70b-versatile";
const MAX_HTML = 24_000;
const MAX_OUTPUT_TOKENS = 900;

export type ReviewFinding = {
  title: string;
  detail: string;
  fix: string;
  severity: "high" | "medium" | "low";
};

export async function POST(request: NextRequest) {
  let body: { html?: unknown };
  try {
    body = (await request.json()) as { html?: unknown };
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const html = typeof body.html === "string" ? body.html : "";
  if (html.length < 200) {
    return Response.json(
      { error: "There is no page to review yet." },
      { status: 400 },
    );
  }

  try {
    const raw = await completeGroq({
      model: REVIEW_MODEL,
      messages: [
        { role: "system", content: buildReviewSystemPrompt() },
        { role: "user", content: html.slice(0, MAX_HTML) },
      ],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      signal: request.signal,
    });

    const findings = parseFindings(raw);
    if (!findings.length) {
      return Response.json(
        { error: "The review came back empty. Try again." },
        { status: 502 },
      );
    }

    return Response.json({ findings });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const message =
      error instanceof GroqError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not review the page.";
    return Response.json({ error: message }, { status: 502 });
  }
}

/** Models wrap JSON in prose and fences no matter how firmly they are told not to. */
function parseFindings(raw: string): ReviewFinding[] {
  let text = raw.trim().replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }

  const list = (parsed as { findings?: unknown })?.findings;
  if (!Array.isArray(list)) return [];

  const severities = new Set(["high", "medium", "low"]);
  return list
    .slice(0, 6)
    .map((item) => {
      const f = (item ?? {}) as Record<string, unknown>;
      const severity = String(f.severity ?? "medium").toLowerCase();
      return {
        title: String(f.title ?? "").slice(0, 120).trim(),
        detail: String(f.detail ?? "").slice(0, 400).trim(),
        fix: String(f.fix ?? "").slice(0, 600).trim(),
        severity: (severities.has(severity)
          ? severity
          : "medium") as ReviewFinding["severity"],
      };
    })
    .filter((f) => f.title && f.fix);
}
