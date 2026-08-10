"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "foundry-theme";

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

/* --------------------------------------------------------------------------
   localStorage is an external store, so it is read through
   useSyncExternalStore rather than copied into state inside an effect. The
   `storage` event covers other tabs; `notify` covers this one, which does not
   receive its own storage events.
-------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

/** The server cannot know the preference; the inline script fixes it up. */
function getServerTheme(): Theme {
  return "system";
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

/**
 * Three explicit states rather than a cycling button — the current theme is
 * always visible instead of being guessable from the icon.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  // Follow the OS while in system mode.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice applies for this page view only */
    }
    applyTheme(next);
    notify();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={`${label} theme`}
            onClick={() => choose(value)}
            className={`flex h-8 w-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 ${
              active
                ? "bg-surface text-fg shadow-[var(--shadow-raised)]"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
