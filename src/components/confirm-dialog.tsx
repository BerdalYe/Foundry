"use client";

import { useEffect, useRef } from "react";

/**
 * Deleting a saved site cannot be undone, so it goes through a real dialog:
 * focus moves into it, Escape and the scrim close it, and focus returns to
 * whatever opened it.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;
    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="animate-scrim fixed inset-0 z-80 flex items-center justify-center p-4"
      // 50% scrim: enough to isolate the dialog, not so much that the page
      // behind it disappears.
      style={{ backgroundColor: "rgb(0 0 0 / 0.5)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="animate-dialog w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-modal)]"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-fg">
          {title}
        </h2>
        <p
          id="confirm-body"
          className="mt-2 text-sm leading-relaxed text-fg-muted"
        >
          {body}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 cursor-pointer rounded-xl border border-border px-4 text-sm font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="h-11 cursor-pointer rounded-xl bg-danger px-4 text-sm font-semibold text-danger-fg transition-opacity duration-150 hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
