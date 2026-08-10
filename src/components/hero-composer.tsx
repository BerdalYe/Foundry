"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, SparkIcon } from "@/components/icons";
import { EnhanceBar, EnhanceButton } from "@/components/enhance-controls";
import { ModelDescription, ModelSelect } from "@/components/model-select";
import { DEFAULT_MODEL } from "@/lib/models";
import { QUICK_PROMPTS } from "@/lib/examples";
import { setPendingBuild } from "@/lib/handoff";
import { usePromptEnhancer } from "@/lib/use-prompt-enhancer";

const MAX = 4000;

export function HeroComposer() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [leaving, setLeaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const grow = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, []);

  // The enhancer replaces the text wholesale, so the box has to re-measure.
  const setPromptAndGrow = useCallback(
    (next: string) => {
      setPrompt(next);
      const el = textareaRef.current;
      if (el) requestAnimationFrame(() => grow(el));
    },
    [grow],
  );

  const enhancer = usePromptEnhancer(prompt, setPromptAndGrow);

  const trimmed = prompt.trim();
  const busy = leaving || enhancer.enhancing;
  const canSubmit = trimmed.length > 0 && !busy;

  function submit() {
    if (!canSubmit) return;
    setLeaving(true);
    setPendingBuild({ prompt: trimmed, model });
    router.push("/build");
  }

  function applyExample(text: string) {
    enhancer.reset();
    setPrompt(text);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => grow(el));
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-overlay)] transition-colors duration-150 focus-within:border-accent-border"
      >
        <label htmlFor="hero-prompt" className="sr-only">
          Describe the website you want
        </label>
        <textarea
          ref={textareaRef}
          id="hero-prompt"
          name="prompt"
          rows={3}
          maxLength={MAX}
          value={prompt}
          // Short enough to read in full at 375px, where the box is 3 rows.
          placeholder="A landing page for an Oslo coffee roaster — brew guides, subscription tiers, and opening hours."
          disabled={enhancer.enhancing}
          onChange={(e) => {
            setPrompt(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="block w-full resize-none bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-fg outline-none placeholder:text-fg-subtle disabled:opacity-60"
        />

        <EnhanceBar enhancer={enhancer} className="px-3.5 pb-2.5" />

        <div className="border-t border-border px-2 pt-2.5 pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ModelSelect value={model} onChange={setModel} id="hero-model" />

            <div className="flex items-center gap-2 sm:gap-3">
              <EnhanceButton enhancer={enhancer} disabled={!trimmed || busy} />
              <span
                className="hidden text-xs text-fg-subtle lg:block"
                aria-hidden="true"
              >
                ⌘ + Enter
              </span>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                <SparkIcon size={17} />
                {leaving ? "Opening…" : "Cast the site"}
              </button>
            </div>
          </div>

          <ModelDescription
            value={model}
            id="hero-model"
            className="mt-2.5 px-0.5"
          />
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-xs font-medium text-fg-subtle">
          Or start from
        </span>
        {QUICK_PROMPTS.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => applyExample(example.prompt)}
            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-fg-muted transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
          >
            {example.label}
            <ArrowRightIcon
              size={13}
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-60"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
