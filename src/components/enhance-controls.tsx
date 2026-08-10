"use client";

import { AlertIcon, PenIcon, SpinnerIcon } from "@/components/icons";
import type { usePromptEnhancer } from "@/lib/use-prompt-enhancer";

type Enhancer = ReturnType<typeof usePromptEnhancer>;

/** "Improve this description with AI" — sits beside the primary action. */
export function EnhanceButton({
  enhancer,
  disabled,
  hint = "Rewrite your description into a fuller brief",
  className = "",
}: {
  enhancer: Enhancer;
  disabled?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => void enhancer.enhance()}
      disabled={disabled || enhancer.enhancing}
      title={hint}
      aria-label={hint}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-fg-muted transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {enhancer.enhancing ? (
        <SpinnerIcon size={15} />
      ) : (
        <PenIcon size={15} aria-hidden="true" />
      )}
      {enhancer.enhancing ? "Improving…" : "Improve"}
    </button>
  );
}

/**
 * Status strip under the textarea: confirms the rewrite happened and offers the
 * way back, or reports why it did not.
 */
export function EnhanceBar({
  enhancer,
  className = "",
}: {
  enhancer: Enhancer;
  className?: string;
}) {
  if (enhancer.error) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-2 text-xs leading-relaxed text-fg-muted ${className}`}
      >
        <AlertIcon size={14} className="mt-px shrink-0 text-danger" />
        <span className="min-w-0 break-words">{enhancer.error}</span>
        <button
          type="button"
          onClick={enhancer.dismissError}
          className="ml-auto shrink-0 cursor-pointer font-semibold text-fg-muted underline underline-offset-2 hover:text-fg"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!enhancer.canUndo) return null;

  return (
    <div
      role="status"
      className={`flex items-center gap-2 text-xs text-fg-subtle ${className}`}
    >
      <span>Rewritten from what you wrote.</span>
      <button
        type="button"
        onClick={enhancer.undo}
        className="cursor-pointer font-semibold text-accent underline underline-offset-2"
      >
        Undo
      </button>
    </div>
  );
}
