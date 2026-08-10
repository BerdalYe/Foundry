import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LibraryIcon, SparkIcon } from "@/components/icons";

const TABS = [
  { href: "/build", key: "build", label: "Builder", Icon: SparkIcon },
  { href: "/library", key: "library", label: "Library", Icon: LibraryIcon },
] as const;

/**
 * The header both app screens share, so moving between building and saved work
 * is one click from anywhere instead of a trip back through the landing page.
 */
export function AppNav({
  current,
  title,
  subtitle,
  actions,
}: {
  current: "build" | "library";
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4">
      <Link
        href="/"
        aria-label="Foundry home"
        className="shrink-0 rounded-lg p-1 transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <LogoMark size={24} />
      </Link>

      <nav aria-label="Sections" className="shrink-0">
        <ul className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-1">
          {TABS.map(({ href, key, label, Icon }) => {
            const active = current === key;
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  // The text is hidden below `sm`; name the link regardless.
                  aria-label={label}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors duration-150 sm:px-3 ${
                    active
                      ? "bg-surface text-fg shadow-[var(--shadow-raised)]"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {title && (
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-sm font-semibold text-fg">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-fg-muted">{subtitle}</p>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
