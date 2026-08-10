import { KeyIcon } from "@/components/icons";

/**
 * Shown only when GROQ_API_KEY is missing. Says what is wrong, and exactly what
 * to do about it — an error that just says "not configured" is not enough.
 */
export function SetupNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex gap-3.5 rounded-xl border border-accent-border bg-accent-soft p-4 ${className}`}
    >
      <KeyIcon size={18} className="mt-0.5 shrink-0 text-accent" />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-fg">Add a Groq API key to generate</p>
        <p className="mt-1 text-fg-muted">
          Create{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg">
            .env.local
          </code>{" "}
          with{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-fg">
            GROQ_API_KEY=your-key
          </code>{" "}
          and restart the dev server. Keys are free at{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-2"
          >
            console.groq.com/keys
          </a>
          .
        </p>
      </div>
    </div>
  );
}
