"use client";

import { useEffect, useState } from "react";
import { CheckIcon, PenIcon } from "@/components/icons";
import {
  HOUSE_STYLE_LIMIT,
  HOUSE_STYLE_PLACEHOLDER,
  writeHouseStyle,
} from "@/lib/house-style";

/**
 * Standing instructions folded into every build. Collapsed by default: it is a
 * set-once thing, and the composer above it is what people came for.
 */
export function HouseStyleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Write through on a pause rather than every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      writeHouseStyle(value);
      if (value.trim()) {
        setSaved(true);
        const clear = setTimeout(() => setSaved(false), 1600);
        return () => clearTimeout(clear);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <div className="mt-6 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="house-style-body"
        className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-3 text-left"
      >
        <PenIcon size={14} className="shrink-0 text-fg-muted" />
        <span className="text-xs font-semibold text-fg">House style</span>
        {value.trim() && !open && (
          <span className="truncate text-xs text-fg-subtle">
            {value.trim().slice(0, 28)}…
          </span>
        )}
        {saved && (
          <CheckIcon size={13} className="ml-auto shrink-0 text-success" />
        )}
        <svg
          className={`ml-auto shrink-0 text-fg-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          } ${saved ? "hidden" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id="house-style-body" className="border-t border-border p-3.5">
          <label
            htmlFor="house-style"
            className="text-xs leading-relaxed text-fg-muted"
          >
            Applied to every build and every change, so you don&rsquo;t retype
            it. Stays on this device.
          </label>
          <textarea
            id="house-style"
            rows={4}
            maxLength={HOUSE_STYLE_LIMIT}
            value={value}
            placeholder={HOUSE_STYLE_PLACEHOLDER}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 block w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-fg transition-colors duration-150 outline-none focus:border-accent-border"
          />
          <p className="mt-1.5 text-right text-[11px] text-fg-subtle tabular-nums">
            {value.length}/{HOUSE_STYLE_LIMIT}
          </p>
        </div>
      )}
    </div>
  );
}
