"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { SHOWCASE } from "@/lib/examples";
import { DEFAULT_MODEL } from "@/lib/models";
import { setPendingBuild } from "@/lib/handoff";

export function ShowcaseCards() {
  const router = useRouter();

  function build(prompt: string) {
    setPendingBuild({ prompt, model: DEFAULT_MODEL });
    router.push("/build");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SHOWCASE.map((example, index) => (
        <Reveal
          as="article"
          key={example.label}
          delay={index * 80}
          className="lift flex flex-col rounded-2xl border border-border bg-surface p-5 hover:border-border-strong"
        >
          <span className="inline-flex w-fit rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
            {example.kind}
          </span>
          <h3 className="mt-3.5 text-base font-semibold text-fg">
            {example.label}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
            {example.prompt}
          </p>
          <button
            type="button"
            onClick={() => build(example.prompt)}
            className="mt-5 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
          >
            Build this one
            <ArrowRightIcon size={15} />
          </button>
        </Reveal>
      ))}
    </div>
  );
}
