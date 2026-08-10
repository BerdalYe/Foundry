"use client";

import { AlertIcon, CheckIcon, SparkIcon, SpinnerIcon } from "@/components/icons";

export type ReviewFinding = {
  title: string;
  detail: string;
  fix: string;
  severity: "high" | "medium" | "low";
};

const SEVERITY: Record<
  ReviewFinding["severity"],
  { label: string; className: string }
> = {
  high: { label: "High", className: "bg-accent-soft text-accent" },
  medium: { label: "Medium", className: "bg-surface-3 text-fg-muted" },
  low: { label: "Low", className: "bg-surface-3 text-fg-subtle" },
};

/**
 * The reviewer suggests; it never edits. Each finding hands its fix to the
 * change box, so nothing is applied without the person pressing the button.
 */
export function ReviewPanel({
  findings,
  running,
  error,
  onRun,
  onApply,
  disabled,
}: {
  findings: ReviewFinding[] | null;
  running: boolean;
  error: string | null;
  onRun: () => void;
  onApply: (fix: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Review
        </h2>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? <SpinnerIcon size={13} /> : <SparkIcon size={13} />}
          {running ? "Reading…" : findings ? "Again" : "Review page"}
        </button>
      </div>

      {!findings && !running && !error && (
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
          Have the page read back to you — hierarchy, copy, mobile layout and
          accessibility — with a fix you can apply for each thing found.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="animate-in-up mt-2.5 flex gap-2.5 rounded-xl border border-border bg-surface-2 p-3"
        >
          <AlertIcon size={15} className="mt-px shrink-0 text-danger" />
          <p className="text-xs leading-relaxed break-words text-fg-muted">
            {error}
          </p>
        </div>
      )}

      {findings && findings.length === 0 && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <CheckIcon size={15} className="shrink-0 text-success" />
          <p className="text-xs text-fg-muted">
            Nothing worth changing came back.
          </p>
        </div>
      )}

      {findings && findings.length > 0 && (
        <ol className="mt-2.5 space-y-1.5">
          {findings.map((finding, index) => (
            <li
              key={`${finding.title}-${index}`}
              className="animate-in-up rounded-xl border border-border bg-surface-2 p-3"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY[finding.severity].className}`}
                >
                  {SEVERITY[finding.severity].label}
                </span>
                <h3 className="text-xs font-semibold text-fg">
                  {finding.title}
                </h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                {finding.detail}
              </p>
              <button
                type="button"
                onClick={() => onApply(finding.fix)}
                className="mt-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-fg transition-colors duration-150 hover:border-accent-border hover:text-accent"
              >
                Use this fix
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
