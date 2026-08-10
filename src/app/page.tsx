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
  DownloadIcon,
  EyeIcon,
  LayersIcon,
  PenIcon,
  SparkIcon,
} from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "One or two sentences is enough. Say who the site is for, what it needs to say, and how it should feel. Detail helps, but nothing is required.",
    Icon: PenIcon,
  },
  {
    n: "02",
    title: "Watch it cast",
    body: "The page streams in as it is written, then renders live in a sandboxed preview. Check it at phone, tablet and desktop widths without leaving the page.",
    Icon: EyeIcon,
  },
  {
    n: "03",
    title: "Refine and keep",
    body: "Ask for changes in plain English — warmer palette, add a pricing table, cut the testimonials. Every version is kept. Download the file when you like it.",
    Icon: DownloadIcon,
  },
];

const FEATURES = [
  {
    title: "One file, no build step",
    body: "HTML, CSS and JavaScript in a single document. Open it in a browser, drop it on any host, or paste it into an existing project.",
    Icon: CodeIcon,
  },
  {
    title: "Responsive from the start",
    body: "Mobile-first layouts with real breakpoints — not a desktop page that happens to shrink.",
    Icon: LayersIcon,
  },
  {
    title: "Dark mode included",
    body: "Every page ships a matching dark scheme driven by prefers-color-scheme, designed alongside the light one.",
    Icon: SparkIcon,
  },
  {
    title: "Accessible by default",
    body: "Semantic landmarks, labelled controls, visible focus rings, contrast-checked colour pairs, and reduced-motion support.",
    Icon: EyeIcon,
  },
  {
    title: "Written content, not filler",
    body: "Plausible copy, prices, hours and names for the subject you described. No lorem ipsum, no bracketed placeholders.",
    Icon: PenIcon,
  },
  {
    title: "Yours to keep",
    body: "No account, no lock-in, no runtime dependency on Foundry. Copy the code or download the file and walk away with it.",
    Icon: DownloadIcon,
  },
];

const FAQ = [
  {
    q: "What exactly do I get?",
    a: "A single .html file containing the whole page — markup, styles and any scripts. It runs by double-clicking it. Photos, when a page uses them, are loaded from picsum.photos, and fonts from Google Fonts; everything else is self-contained.",
  },
  {
    q: "Can I change it after it is generated?",
    a: "Yes, in two ways. Describe the change in the refine box and the page is rewritten around it, or open the code panel, copy it out and edit by hand. Foundry keeps every version, so you can step back to an earlier one at any time.",
  },
  {
    q: "Which model should I pick?",
    a: "GPT-OSS 120B is the default and produces the most complete pages. Drop to GPT-OSS 20B or Llama 3.1 8B when you want a rough draft quickly — you can switch models between refinements on the same page.",
  },
  {
    q: "Where does my description go?",
    a: "To Groq's API, from this app's server, using the key in your .env.local. Nothing is stored server-side: your builds live in your browser tab and disappear when you close it.",
  },
  {
    q: "Do I need an API key?",
    a: "Yes — a free one from console.groq.com/keys. It goes in .env.local as GROQ_API_KEY and is only ever read on the server, never sent to the browser.",
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
                  The short version: it is one HTML file, it is yours, and
                  nothing is stored.
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
