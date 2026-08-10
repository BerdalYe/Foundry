"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades content up as it enters the viewport. The observer is the only thing
 * that ever sets state, so nothing renders twice on mount, and the reveal is
 * neutralised entirely under prefers-reduced-motion (see globals.css).
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering siblings. Keep the total under ~300ms. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  // Widening the tag: the intrinsic props of div/section/li/article do not
  // unify, and this component only ever forwards a className and a ref.
  const Component = Tag as React.ElementType;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      // Fire a little before the element is fully in view.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={`reveal ${shown ? "reveal-shown" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
