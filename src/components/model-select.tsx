"use client";

import { MODELS, getModel } from "@/lib/models";

const describedBy = (id: string) => `${id}-description`;

/**
 * A native <select> on purpose: it is keyboard- and screen-reader-correct for
 * free, and opens as a proper wheel on mobile.
 *
 * Native options cannot carry two lines, so each one gets a short tag inline,
 * and <ModelDescription> renders the full description for whichever model is
 * selected. They are separate components so the caller can place the
 * description on its own row; pass both the same `id` to keep them wired
 * together for screen readers.
 */
export function ModelSelect({
  value,
  onChange,
  id = "model",
  disabled,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-medium whitespace-nowrap text-fg-muted"
      >
        Model
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy(id)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface py-2 pr-8 pl-2.5 text-xs font-medium text-fg transition-colors duration-150 hover:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} · {model.tag}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-muted"
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
      </div>
    </div>
  );
}

export function ModelDescription({
  value,
  id = "model",
  className = "",
}: {
  value: string;
  id?: string;
  className?: string;
}) {
  const model = getModel(value);
  if (!model) return null;

  return (
    <p
      id={describedBy(id)}
      className={`text-xs leading-relaxed text-fg-subtle ${className}`}
    >
      {model.blurb}
    </p>
  );
}
