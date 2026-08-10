"use client";

import { useEffect, useRef, useState } from "react";
import { ArchiveIcon, CodeIcon, DownloadIcon } from "@/components/icons";

/**
 * One page can be taken away two ways, so it is a choice rather than two
 * buttons whose difference you have to guess from an icon.
 */
export function DownloadMenu({
  disabled,
  onSingleFile,
  onZip,
}: {
  disabled: boolean;
  onSingleFile: () => void;
  onZip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (run: () => void) => {
    setOpen(false);
    run();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Download this page"
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <DownloadIcon size={14} />
        <span className="hidden sm:inline">Download</span>
        <svg
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Download format"
          className="animate-in-up absolute top-full right-0 z-60 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-modal)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onSingleFile)}
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
          >
            <CodeIcon size={15} className="mt-0.5 shrink-0 text-fg-muted" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-fg">
                One HTML file
              </span>
              <span className="block text-[11px] leading-relaxed text-fg-muted">
                Everything inline. Double-click and it runs.
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onZip)}
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
          >
            <ArchiveIcon size={15} className="mt-0.5 shrink-0 text-fg-muted" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-fg">
                Separate files (.zip)
              </span>
              <span className="block text-[11px] leading-relaxed text-fg-muted">
                index.html, styles.css, script.js — for editing properly.
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
