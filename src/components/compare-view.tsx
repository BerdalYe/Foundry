"use client";

import { useState } from "react";

type ComparableVersion = { id: string; title: string; prompt: string };

/**
 * Two versions side by side. A refine rewrites the whole document, so "what
 * actually changed?" is otherwise guesswork — this answers it by eye.
 *
 * The frames are inert: no scripts, no forms. This is for looking, and it keeps
 * two more live documents from running at once.
 */
export function CompareView({
  versions,
  htmlFor,
  initialLeftId,
  initialRightId,
}: {
  versions: ComparableVersion[];
  htmlFor: (id: string) => string;
  initialLeftId: string;
  initialRightId: string;
}) {
  const [leftChoice, setLeftId] = useState(initialLeftId);
  const [rightChoice, setRightId] = useState(initialRightId);

  // Derived rather than synced: if a chosen version disappears (a new build, a
  // restored project), fall back during render instead of firing an effect to
  // correct state after the fact.
  const exists = (id: string) => versions.some((v) => v.id === id);
  const leftId = exists(leftChoice) ? leftChoice : initialLeftId;
  const rightId = exists(rightChoice) ? rightChoice : initialRightId;

  return (
    <div className="grid h-full grid-rows-2 gap-3 bg-canvas p-3 lg:grid-cols-2 lg:grid-rows-1">
      {[
        { side: "Before", id: leftId, set: setLeftId },
        { side: "After", id: rightId, set: setRightId },
      ].map(({ side, id, set }) => {
        const index = versions.findIndex((v) => v.id === id);
        return (
          <div
            key={side}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-raised)]"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-2.5 py-2">
              <span className="text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
                {side}
              </span>
              <label className="sr-only" htmlFor={`compare-${side}`}>
                {side} version
              </label>
              <select
                id={`compare-${side}`}
                value={id}
                onChange={(e) => set(e.target.value)}
                className="ml-auto min-w-0 cursor-pointer truncate rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-fg outline-none"
              >
                {versions.map((version, i) => (
                  <option key={version.id} value={version.id}>
                    v{i + 1} — {version.title}
                  </option>
                ))}
              </select>
            </div>

            <iframe
              title={`${side}: ${versions[index]?.title ?? ""}`}
              srcDoc={htmlFor(id)}
              sandbox=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="min-h-0 flex-1 border-0 bg-white"
            />

            {versions[index]?.prompt && (
              <p className="shrink-0 truncate border-t border-border px-2.5 py-1.5 text-[11px] text-fg-subtle">
                {versions[index].prompt}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
