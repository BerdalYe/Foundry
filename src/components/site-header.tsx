"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CloseIcon, LibraryIcon, MenuIcon } from "@/components/icons";

const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#examples", label: "Examples" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // A menu that survives a resize into the desktop layout would be stranded.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    media.addEventListener("change", close);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      media.removeEventListener("change", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="-m-2 rounded-lg p-2 transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          aria-label="Foundry home"
        >
          <Logo />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/library"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            <LibraryIcon size={15} />
            Library
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/build"
            className="hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover sm:inline-flex"
          >
            Open the builder
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border text-fg-muted transition-colors duration-150 hover:text-fg md:hidden"
          >
            {open ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      {/* Below md the section links and the builder link used to vanish
          entirely; this gives them somewhere to live. */}
      {open && (
        <div
          id="mobile-menu"
          className="animate-in-up border-t border-border bg-bg px-5 pt-2 pb-4 md:hidden"
        >
          <ul className="flex flex-col">
            {SECTIONS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center rounded-lg px-2 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/library"
                onClick={() => setOpen(false)}
                className="flex h-12 items-center gap-2 rounded-lg px-2 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
              >
                <LibraryIcon size={16} />
                Library
              </Link>
            </li>
          </ul>
          <Link
            href="/build"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
          >
            Open the builder
          </Link>
        </div>
      )}
    </header>
  );
}
