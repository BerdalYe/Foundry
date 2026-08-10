/**
 * The Foundry mark: a crucible with molten metal at rest, and a single drop
 * about to fall. Drawn on the same 24px grid as the icon set.
 */
export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="24" height="24" rx="6.5" className="fill-accent" />
      <path
        d="M12 4.6v3.2"
        stroke="var(--accent-fg)"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M6.6 9.6h10.8a.8.8 0 0 1 .8.8v3.4a5.8 5.8 0 0 1-5.8 5.8h-.8a5.8 5.8 0 0 1-5.8-5.8v-3.4a.8.8 0 0 1 .8-.8Z"
        fill="var(--accent-fg)"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-[17px] font-semibold tracking-[-0.02em] text-fg ${className}`}
    >
      Foundry
    </span>
  );
}

export function Logo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <Wordmark />
    </span>
  );
}
