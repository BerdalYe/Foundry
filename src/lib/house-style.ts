"use client";

/**
 * Standing instructions applied to every build, so preferences don't have to be
 * retyped into each prompt. Kept in localStorage rather than the session: they
 * are meant to outlive the tab.
 */
const KEY = "foundry:house-style";

export const HOUSE_STYLE_LIMIT = 600;

export const HOUSE_STYLE_PLACEHOLDER =
  "British English. Never use stock photos — inline SVG and gradients only. Brand colour is #1f6feb.";

export function readHouseStyle(): string {
  try {
    return (localStorage.getItem(KEY) ?? "").slice(0, HOUSE_STYLE_LIMIT);
  } catch {
    return "";
  }
}

export function writeHouseStyle(value: string): void {
  try {
    const trimmed = value.trim().slice(0, HOUSE_STYLE_LIMIT);
    if (trimmed) localStorage.setItem(KEY, trimmed);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the style applies for this page view only */
  }
}
