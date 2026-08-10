"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Rewrites a short description into a fuller brief, keeping the original so the
 * change is always reversible — an AI rewrite that silently eats what someone
 * typed is not acceptable.
 */
export function usePromptEnhancer(
  value: string,
  onChange: (next: string) => void,
  options?: {
    /** "refine" sharpens a change request instead of writing a site brief. */
    mode?: "create" | "refine";
    /** The page being changed, so the rewrite can name what is really there. */
    currentHtml?: string;
  },
) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mode = options?.mode ?? "create";
  const currentHtml = options?.currentHtml;

  const enhance = useCallback(async () => {
    const prompt = value.trim();
    if (!prompt || enhancing) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEnhancing(true);
    setError(null);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          currentHtml: mode === "refine" ? currentHtml : undefined,
        }),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => null)) as {
        prompt?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.prompt) {
        throw new Error(data?.error ?? `Rewrite failed (${res.status}).`);
      }

      setOriginal(prompt);
      onChange(data.prompt);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError((err as Error)?.message ?? "Could not rewrite that.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setEnhancing(false);
    }
  }, [value, enhancing, onChange, mode, currentHtml]);

  const undo = useCallback(() => {
    if (original === null) return;
    onChange(original);
    setOriginal(null);
    setError(null);
  }, [original, onChange]);

  /** Call when the text is replaced for another reason (submit, example, reset). */
  const reset = useCallback(() => {
    setOriginal(null);
    setError(null);
  }, []);

  return {
    enhancing,
    error,
    canUndo: original !== null,
    enhance,
    undo,
    reset,
    dismissError: () => setError(null),
  };
}
