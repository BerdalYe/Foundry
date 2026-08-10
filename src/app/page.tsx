import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroComposer } from "@/components/hero-composer";
import { ShowcaseCards } from "@/components/showcase-cards";
import { SetupNotice } from "@/components/setup-notice";
import { Reveal } from "@/components/reveal";
import {
  ArrowRightIcon,
  CodeIcon,
  CompareIcon,
  EyeIcon,
  LayersIcon,
  LibraryIcon,
  PenIcon,
  SparkIcon,
} from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "A sentence is enough. If it feels thin, press Improve and it becomes a proper brief — sections, audience, real specifics — before anything is built.",
    Icon: PenIcon,
  },
  {
    n: "02",
    title: "Watch it build",
    body: "The page streams in as it is written, then renders live in a sandboxed preview. Check it at phone, tablet and desktop widths without leaving the page.",
    Icon: EyeIcon,
  },
  {
    n: "03",
    title: "Refine, section by section",
    body: "Change the whole page, or scope a change to one block — the pricing table, the header — which takes about a second and cannot disturb anything else.",
    Icon: LayersIcon,
  },
];

const FEATURES = [
  {
    title: "One file, or three",
    body: "Take it as a single self-contained .html, or as a zip of index.html, styles.css and script.js when you want to keep working on it properly.",
    Icon: CodeIcon,
  },
  {
    title: "Saved as you go",
    body: "Every build lands in your library automatically, stored on your device. Close the browser and it is still there. Nothing is kept on a server.",
    Icon: LibraryIcon,
  },
  {
    title: "Have it reviewed",
    body: "Ask for a read-back and get specific findings — hierarchy, copy, mobile layout, accessibility — each with a fix you can apply in one click.",
    Icon: SparkIcon,
  },
  {
    title: "A house style that sticks",
    body: "Set standing instructions once — British English, no stock photos, your brand colour — and every build follows them without retyping.",
    Icon: PenIcon,
  },
  {
    title: "Accessible and responsive",
    body: "Mobile-first layouts, semantic landmarks, labelled controls, visible focus rings, contrast-checked pairs, and a matching dark scheme.",
    Icon: EyeIcon,
  },
  {
    title: "Bring your own page",
    body: "Import an HTML file you already have and refine it here. Compare any two versions side by side to see exactly what changed.",
    Icon: CompareIcon,
  },
];

const FAQ = [
  {
    q: "What exactly do I get?",
    a: "Either a single .html file with the markup, styles and scripts inline — double-click and it runs — or a zip of index.html, styles.css and script.js. Photos, when a page uses them, come from picsum.photos and fonts from Google Fonts; everything else is self-contained.",
  },
  {
    q: "Where is my work saved?",
    a: "In your browser's own storage, on this device, automatically — you never press save. Closing the browser does not lose it. Nothing is stored on a server, which also means your library does not follow you to another machine.",
  },
  {
    q: "Can I change just one part of the page?",
    a: "Yes, and it is the better way to work. Pick a section — pricing, the header, whatever the page has — and only that block is rewritten. It takes about a second instead of half a minute, and it cannot disturb the rest of the page.",
  },
  {
    q: "Which model should I pick?",
    a: "GPT-OSS 120B is the default and produces the most complete pages. Drop to GPT-OSS 20B or Llama 3.1 8B for a quick draft, or Llama 3.3 70B when a page is long enough to get cut off. Improve and Review deliberately run on a different model, so they never eat the budget the build needs.",
  },
  {
    q: "Can I bring a page I already have?",
    a: "Yes. Import an HTML file and it becomes your first version, refinable exactly like a generated one — whole page or one section at a time.",
  },
  {
    q: "Do I need an API key?",
    a: "Yes — a free one from console.groq.com/keys. It goes in .env.local as GROQ_API_KEY, or in your host's environment variables, and is only ever read on the server, never sent to the browser.",
  },
];

export default function Home() {
  const hasKey = Boolean(process.env.GROQ_API_KEY);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero ------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-dots"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
            <div className="mx-auto max-w-2xl text-center">
              {/* A short stagger on load: heading, then subhead, then the box
                  you are meant to type in. */}
              <h1 className="animate-in-up text-4xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance text-fg sm:text-5xl md:text-6xl">
                Build a website by describing it.
              </h1>

              <p
                className="animate-in-up mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-fg-muted sm:text-lg"
                style={{ animationDelay: "80ms" }}
              >
                Write a sentence about the site you want. Foundry casts it into
                a complete, responsive page — real copy, working interactions,
                dark mode included — in about the time it takes to read this.
              </p>
            </div>

            <div
              className="animate-in-up mx-auto mt-10 max-w-2xl"
              style={{ animationDelay: "160ms" }}
            >
              {!hasKey && <SetupNotice className="mb-5" />}
              <HeroComposer />
            </div>
          </div>
        </section>

        {/* How it works ----------------------------------------------- */}
        <section
          id="how"
          className="scroll-mt-20 border-t border-border bg-surface-2"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
                Three steps, no setup
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                There is no canvas to learn and no component tree to wrangle.
                You write; Foundry builds.
              </p>
            </Reveal>

            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map(({ n, title, body, Icon }, index) => (
                <Reveal
                  as="li"
                  key={n}
                  delay={index * 80}
                  className="lift rounded-2xl border border-border bg-surface p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon size={18} />
                    </span>
                    <span className="font-mono text-xs font-medium tracking-widest text-fg-subtle">
                      {n}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {body}
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Features --------------------------------------------------- */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
                What comes out of the mould
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                Every page is held to the same standard, whatever you asked for.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ title, body, Icon }, index) => (
                <Reveal key={title} delay={(index % 3) * 70}>
                  <Icon size={20} className="text-accent" />
                  <h3 className="mt-3.5 text-base font-semibold text-fg">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Examples --------------------------------------------------- */}
        <section
          id="examples"
          className="scroll-mt-20 border-t border-border bg-surface-2"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
                Start from an example
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                These are real prompts, not screenshots. Pick one and watch it
                build — then change anything you like.
              </p>
            </Reveal>
            <div className="mt-12">
              <ShowcaseCards />
            </div>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
                  Questions
                </h2>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  The short version: it is yours, it saves itself, and nothing
                  leaves your machine.
                </p>
              </div>

              <dl className="divide-y divide-border border-y border-border">
                {FAQ.map(({ q, a }) => (
                  <div key={q} className="py-5">
                    <dt className="text-base font-semibold text-fg">{q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-fg-muted">
                      {a}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Closing CTA ------------------------------------------------ */}
        <section className="border-t border-border bg-surface-2">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-6 sm:py-24">
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
              Describe it once. Keep the file.
            </h2>
            <Link
              href="/build"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
            >
              Open the builder
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
