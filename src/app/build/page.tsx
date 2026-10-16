import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Builder } from "@/components/builder";
import { SpinnerIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Builder — Foundry",
  description:
    "Describe a website, watch it build, refine it in plain English, and save it to your device.",
};

export default async function BuildPage() {
  // Per request, not at build time: a prerendered page would freeze whether
  // the key existed when `next build` ran, so a key set later in the host's
  // environment would still show the setup notice.
  await connection();
  // Read on the server so the key itself never reaches the browser — only
  // whether one exists, which is what the UI needs to know.
  const hasKey = Boolean(process.env.GROQ_API_KEY);

  return (
    <main id="main">
      {/* The builder reads ?project= with useSearchParams; the spinner covers
          the moment before it mounts. */}
      <Suspense fallback={<BuilderFallback />}>
        <Builder hasKey={hasKey} />
      </Suspense>
    </main>
  );
}

function BuilderFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg">
      <SpinnerIcon size={24} className="text-fg-subtle" />
      <span className="sr-only">Loading the builder…</span>
    </div>
  );
}
