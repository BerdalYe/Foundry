import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo size={24} />
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            Describe a website. Get a complete, single-file page you can keep.
            Generation runs on Groq.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
          <Link
            href="/build"
            className="text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            Builder
          </Link>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            Groq API keys
          </a>
        </nav>
      </div>
    </footer>
  );
}
