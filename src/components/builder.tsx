"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { CodeView } from "@/components/code-view";
import {
  PreviewFrame,
  type Device,
  type PreviewMetrics,
} from "@/components/preview-frame";
import { EnhanceBar, EnhanceButton } from "@/components/enhance-controls";
import { ModelDescription, ModelSelect } from "@/components/model-select";
import { HouseStyleEditor } from "@/components/house-style-editor";
import { ReviewPanel, type ReviewFinding } from "@/components/review-panel";
import { CompareView } from "@/components/compare-view";
import { DownloadMenu } from "@/components/download-menu";
import { usePromptEnhancer } from "@/lib/use-prompt-enhancer";
import { readHouseStyle } from "@/lib/house-style";
import { listSections, replaceSection, styleContext } from "@/lib/sections";
import { buildZip, splitIntoFiles } from "@/lib/zip";
import { SetupNotice } from "@/components/setup-notice";
import { LogoMark } from "@/components/logo";
import {
  AlertIcon,
  CheckIcon,
  CompareIcon,
  CodeIcon,
  CopyIcon,
  ExpandIcon,
  EyeIcon,
  LayersIcon,
  MonitorIcon,
  PenIcon,
  PhoneIcon,
  PlusIcon,
  SaveIcon,
  ShrinkIcon,
  SparkIcon,
  SpinnerIcon,
  StopIcon,
  TabletIcon,
  UploadIcon,
} from "@/components/icons";
import { DEFAULT_MODEL } from "@/lib/models";
import { deriveTitle, finalizeHtml, slugify } from "@/lib/html";
import { readNdjsonStream } from "@/lib/ndjson";
import { takePendingBuild } from "@/lib/handoff";
import {
  getProject,
  newProjectId,
  putProject,
  type SavedProject,
} from "@/lib/library";

type Version = {
  id: string;
  title: string;
  prompt: string;
  mode: "create" | "refine";
  model: string;
  html: string;
  createdAt: number;
  partial?: boolean;
  /** Set when only one block was rewritten, e.g. "Pricing". */
  scopeLabel?: string;
};

const SESSION_KEY = "foundry:session";
/** Keep the tab's storage well clear of the ~5 MB sessionStorage ceiling. */
const MAX_STORED_VERSIONS = 8;
/** Re-rendering the iframe on every chunk would thrash; this paces it. */
const PREVIEW_THROTTLE_MS = 700;

const DEVICES: { value: Device; label: string; Icon: typeof MonitorIcon }[] = [
  { value: "desktop", label: "Desktop", Icon: MonitorIcon },
  { value: "tablet", label: "Tablet", Icon: TabletIcon },
  { value: "mobile", label: "Mobile", Icon: PhoneIcon },
];

export function Builder({ hasKey }: { hasKey: boolean }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  const [streaming, setStreaming] = useState(false);
  const [streamHtml, setStreamHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [thinking, setThinking] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"preview" | "code" | "compare">("preview");
  const [houseStyle, setHouseStyle] = useState("");
  /** "page", or the index of the block a change is scoped to. */
  const [scope, setScope] = useState("page");
  const [sectionBusy, setSectionBusy] = useState(false);
  const [review, setReview] = useState<ReviewFinding[] | null>(null);
  const [reviewRunning, setReviewRunning] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pane, setPane] = useState<"compose" | "canvas">("compose");
  const [metrics, setMetrics] = useState<PreviewMetrics>({
    overflowBy: 0,
    viewportWidth: 0,
    offenders: [],
  });

  const [projectId, setProjectId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const searchParams = useSearchParams();

  const abortRef = useRef<AbortController | null>(null);
  /** Only the newest run may write state; superseded runs go quiet. */
  const runIdRef = useRef(0);
  /** Mirrors `versions` so a finished run can persist without a stale closure. */
  const versionsRef = useRef<Version[]>([]);
  const projectIdRef = useRef<string | null>(null);
  /** Mirrored so requests don't have to re-create their callbacks per keystroke. */
  const houseStyleRef = useRef("");
  const htmlRef = useRef("");
  const lastPaintRef = useRef(0);
  const startedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeVersion = useMemo(
    () => versions.find((v) => v.id === activeId) ?? null,
    [versions, activeId],
  );

  const saved = saveState === "saved";

  const sections = useMemo(
    () => (activeVersion ? listSections(activeVersion.html) : []),
    [activeVersion],
  );

  const scopedSection =
    scope === "page" ? null : (sections[Number(scope)] ?? null);

  /** Keeps the ref mirrors and React state in step. */
  const applyVersions = useCallback((next: Version[]) => {
    versionsRef.current = next;
    setVersions(next);
  }, []);

  const setProject = useCallback((id: string | null) => {
    projectIdRef.current = id;
    setProjectId(id);
  }, []);

  /** Writes the whole project — every version — to IndexedDB. */
  const persist = useCallback(
    async (id: string, list: Version[], activeVersionId: string) => {
      const existing = await getProject(id);
      const active = list.find((v) => v.id === activeVersionId) ?? list.at(-1);
      const project: SavedProject = {
        id,
        title: existing?.title ?? active?.title ?? "Untitled site",
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        activeVersionId,
        versions: list,
      };
      await putProject(project);
    },
    [],
  );

  /**
   * Adds a finished document as a new version and files it in the library.
   * Shared by full generation, scoped section rewrites, and imports.
   */
  const commitVersion = useCallback(
    (opts: {
      html: string;
      prompt: string;
      mode: "create" | "refine";
      modelId: string;
      partial?: boolean;
      scopeLabel?: string;
    }) => {
      const version: Version = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        title: deriveTitle(opts.html, opts.prompt),
        prompt: opts.prompt,
        mode: opts.mode,
        model: opts.modelId,
        html: opts.html,
        createdAt: Date.now(),
        partial: opts.partial,
        scopeLabel: opts.scopeLabel,
      };

      const nextVersions = [...versionsRef.current, version];
      applyVersions(nextVersions);
      setActiveId(version.id);
      setPreviewHtml(opts.html);
      setInput("");
      setTab("preview");
      setReview(null);

      // Every finished build lands in the library by itself. The first one
      // creates the project; the rest keep it current.
      const id = projectIdRef.current ?? newProjectId();
      if (!projectIdRef.current) setProject(id);
      setSaveState("saving");
      void persist(id, nextVersions, version.id)
        .then(() => setSaveState("saved"))
        .catch((err: unknown) => {
          setSaveState("error");
          // Auto-save failing silently is worse than not auto-saving at all —
          // the page is still on screen and looks safe when it is not.
          setError(
            `Built, but could not save to this device: ${
              (err as Error)?.message ?? "storage refused the write"
            }`,
          );
        });
    },
    [applyVersions, persist, setProject],
  );

  const saveToDevice = useCallback(async () => {
    const list = versionsRef.current;
    if (!list.length) return;

    setSaveState("saving");
    try {
      const id = projectIdRef.current ?? newProjectId();
      await persist(id, list, activeId ?? list.at(-1)!.id);
      setProject(id);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(
        (err as Error)?.message ?? "Could not save to this device.",
      );
    }
  }, [activeId, persist, setProject]);

  // With a page on screen, "Improve" sharpens the change request against that
  // actual document rather than writing a fresh site brief.
  const enhancer = usePromptEnhancer(input, setInput, {
    mode: activeVersion ? "refine" : "create",
    currentHtml: activeVersion?.html,
  });

  const shownHtml = streaming ? previewHtml : (activeVersion?.html ?? "");
  const shownCode = streaming ? streamHtml : (activeVersion?.html ?? "");
  const hasOutput = shownCode.length > 0;
  const isRefine = Boolean(activeVersion) && !streaming;

  /* ---------------------------------------------------------------- generate */

  /**
   * Everything the run needs is passed in, so this never reads component state.
   * That keeps it safe to call from the mount effect, before state has settled.
   */
  const runGeneration = useCallback(
    async (options: {
      prompt: string;
      modelId: string;
      mode: "create" | "refine";
      baseHtml?: string;
    }) => {
      const { prompt, modelId, mode, baseHtml } = options;

      const runId = ++runIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      htmlRef.current = "";
      lastPaintRef.current = 0;
      setError(null);
      setThinking("");
      setStreamHtml("");
      setPreviewHtml("");
      setStreaming(true);
      setElapsed(0);
      setTab("code");
      setPane("canvas");

      let failed: string | null = null;

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: modelId,
            mode,
            currentHtml: mode === "refine" ? baseHtml : undefined,
            houseStyle: houseStyleRef.current,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(detail?.error ?? `Request failed (${res.status}).`);
        }

        await readNdjsonStream(res.body, (event) => {
          if (runIdRef.current !== runId) return;
          if (event.t === "chunk") {
            htmlRef.current += event.v;
            setStreamHtml(htmlRef.current);
            const now = Date.now();
            if (now - lastPaintRef.current > PREVIEW_THROTTLE_MS) {
              lastPaintRef.current = now;
              setPreviewHtml(htmlRef.current);
            }
          } else if (event.t === "thinking") {
            setThinking((prev) => (prev + event.v).slice(-160));
          } else if (event.t === "error") {
            failed = event.v;
          }
        });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          failed = (err as Error)?.message ?? "Generation failed.";
        }
      }

      // A newer run has taken over: leave every piece of state to it.
      if (runIdRef.current !== runId) return;

      const aborted = controller.signal.aborted;
      const html = finalizeHtml(htmlRef.current);
      abortRef.current = null;
      setStreaming(false);
      setThinking("");

      if (failed) {
        setError(failed);
        return;
      }

      // Too little to be a page — say so rather than committing an empty build.
      if (html.length < 120) {
        setError(
          aborted
            ? "Stopped before the page had taken shape. Nothing was saved."
            : "The model returned no usable HTML. Try again, or pick a different model.",
        );
        return;
      }

      commitVersion({
        html,
        prompt,
        mode,
        modelId,
        partial: aborted || !/<\/html>\s*$/i.test(html),
      });
    },
    [commitVersion],
  );

  /**
   * Rewrites one block instead of the document. Everything outside it is
   * copied through untouched, which is both far cheaper and the only way a
   * long page can be edited without risking truncation elsewhere.
   */
  const changeSection = useCallback(
    async (instruction: string) => {
      const base = activeVersion;
      const target = scopedSection;
      if (!base || !target) return;

      setSectionBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            block: target.html,
            css: styleContext(base.html),
            model,
            houseStyle: houseStyleRef.current,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          html?: string;
          error?: string;
        } | null;
        if (!res.ok || !data?.html) {
          throw new Error(data?.error ?? `Request failed (${res.status}).`);
        }

        commitVersion({
          html: replaceSection(base.html, target, data.html),
          prompt: instruction,
          mode: "refine",
          modelId: model,
          scopeLabel: target.label,
        });
      } catch (err) {
        setError((err as Error)?.message ?? "Could not rewrite that section.");
      } finally {
        setSectionBusy(false);
      }
    },
    [activeVersion, scopedSection, model, commitVersion],
  );

  function submit() {
    const prompt = input.trim();
    if (!prompt || streaming || sectionBusy || enhancer.enhancing) return;
    enhancer.reset();

    if (activeVersion && scopedSection) {
      void changeSection(prompt);
      return;
    }

    void runGeneration({
      prompt,
      modelId: model,
      mode: activeVersion ? "refine" : "create",
      baseHtml: activeVersion?.html,
    });
  }

  async function runReview() {
    if (!activeVersion) return;
    setReviewRunning(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: activeVersion.html }),
      });
      const data = (await res.json().catch(() => null)) as {
        findings?: ReviewFinding[];
        error?: string;
      } | null;
      if (!res.ok || !data?.findings) {
        throw new Error(data?.error ?? `Review failed (${res.status}).`);
      }
      setReview(data.findings);
    } catch (err) {
      setReviewError((err as Error)?.message ?? "Could not review the page.");
    } finally {
      setReviewRunning(false);
    }
  }

  /** Brings an existing page in so it can be refined like a generated one. */
  async function importHtml(file: File) {
    setError(null);
    if (file.size > 400_000) {
      setError("That file is too large to work with. Keep it under 400 KB.");
      return;
    }
    const text = await file.text();
    if (!/<html[\s>]|<!doctype\s+html/i.test(text)) {
      setError("That does not look like an HTML page.");
      return;
    }
    commitVersion({
      html: finalizeHtml(text),
      prompt: `Imported ${file.name}`,
      mode: "create",
      modelId: model,
    });
  }

  function downloadZip() {
    const name = slugify(activeVersion?.title ?? "foundry-site");
    const bytes = buildZip(splitIntoFiles(shownCode));
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function stop() {
    abortRef.current?.abort();
  }

  /**
   * Fills the change box with an instruction that names the actual offending
   * elements. A generic "make it responsive" reliably fails; naming the element
   * and its measured width does not.
   */
  function askForOverflowFix() {
    const named = metrics.offenders
      .map(
        (o) =>
          `${o.name} is ${o.width}px wide${o.hasTable ? " and contains a table" : ""}`,
      )
      .join("; ");

    setInput(
      `The page scrolls sideways at ${device} width: it is ${metrics.overflowBy}px wider than the viewport.` +
        (named ? ` The elements at fault: ${named}.` : "") +
        ` Make every one of them fit. Replace any 100vw width with 100%; remove width:100% from anything that also has a left or right margin; wrap each table in its own div with overflow-x:auto so the table cannot widen its parent; and set min-width:0 on flex and grid children.` +
        (metrics.viewportWidth
          ? ` Nothing may be wider than ${metrics.viewportWidth}px there.`
          : "") +
        ` Change nothing else about the design.`,
    );
    enhancer.reset();
    setPane("compose");
    textareaRef.current?.focus();
  }

  function startOver() {
    // Retire the in-flight run silently — "New" is not a failure to report.
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setThinking("");
    applyVersions([]);
    setActiveId(null);
    setProject(null);
    setSaveState("idle");
    setStreamHtml("");
    setPreviewHtml("");
    setError(null);
    setInput("");
    setMetrics({ overflowBy: 0, viewportWidth: 0, offenders: [] });
    setScope("page");
    setReview(null);
    setReviewError(null);
    enhancer.reset();
    setPane("compose");
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing to clean up */
    }
    textareaRef.current?.focus();
  }

  /* ------------------------------------------------------------- lifecycle */

  // Restore the tab's previous session, then run anything handed over from the
  // landing page. Guarded so React's double-invoked effects cast once.
  //
  // set-state-in-effect is disabled deliberately: /build is prerendered, so
  // sessionStorage cannot be read during render without a hydration mismatch.
  // This is a one-shot read of an external store on mount, not a reactive
  // dependency, so it cannot cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const style = readHouseStyle();
    if (style) {
      houseStyleRef.current = style;
      setHouseStyle(style);
    }

    // Arriving from the library: that project wins over the tab's session.
    const requested = searchParams.get("project");
    if (requested) {
      void (async () => {
        try {
          const project = await getProject(requested);
          if (!project?.versions.length) {
            setError("That saved site could not be found on this device.");
            return;
          }
          applyVersions(project.versions);
          setActiveId(project.activeVersionId ?? project.versions.at(-1)!.id);
          setProject(project.id);
          setSaveState("saved");
          setPane("canvas");
        } catch (err) {
          setError((err as Error)?.message ?? "Could not open that site.");
        }
      })();
      return;
    }

    // Coming from the landing page means "build another one", so this starts a
    // fresh project rather than adding a version to whatever was here before.
    // The previous work is already safe — it auto-saved to the library.
    const pending = takePendingBuild();
    if (pending) {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* nothing to clear */
      }
      setModel(pending.model);
      void runGeneration({
        prompt: pending.prompt,
        modelId: pending.model,
        mode: "create",
      });
      return;
    }

    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const restored = JSON.parse(raw) as {
          versions?: Version[];
          activeId?: string | null;
          model?: string;
          projectId?: string | null;
        };
        if (Array.isArray(restored.versions) && restored.versions.length) {
          applyVersions(restored.versions);
          setActiveId(restored.activeId ?? restored.versions.at(-1)!.id);
          setPane("canvas");
        }
        if (restored.model) setModel(restored.model);
        if (restored.projectId) {
          setProject(restored.projectId);
          setSaveState("saved");
        }
      }
    } catch {
      /* corrupt session — start clean */
    }
  }, [runGeneration, searchParams, applyVersions, setProject]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist so a refresh (or a stray navigation) does not lose the work.
  useEffect(() => {
    if (!versions.length) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          versions: versions.slice(-MAX_STORED_VERSIONS),
          activeId,
          model,
          projectId,
        }),
      );
    } catch {
      /* over quota: the session simply is not restorable */
    }
  }, [versions, activeId, model, projectId]);

  // A running clock is the honest progress indicator here — token counts are
  // meaningless to the person waiting.
  useEffect(() => {
    if (!streaming) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 200);
    return () => clearInterval(id);
  }, [streaming]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  /* ---------------------------------------------------------------- actions */

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(shownCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not reach the clipboard. Select the code and copy it.");
    }
  }

  function download() {
    const name = slugify(activeVersion?.title ?? "foundry-site");
    const blob = new Blob([shownCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------------ view */

  const canvas = (
    <section
      className={`flex min-w-0 flex-1 flex-col bg-bg ${
        fullscreen ? "fixed inset-0 z-70" : ""
      } ${pane === "canvas" ? "flex" : "hidden"} lg:flex`}
    >
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <div
          role="tablist"
          aria-label="Output view"
          className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-1"
        >
          {(
            [
              { value: "preview", label: "Preview", Icon: EyeIcon },
              { value: "code", label: "Code", Icon: CodeIcon },
              ...(versions.length > 1
                ? ([
                    { value: "compare", label: "Compare", Icon: CompareIcon },
                  ] as const)
                : []),
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              role="tab"
              type="button"
              id={`tab-${value}`}
              aria-selected={tab === value}
              aria-controls="output-panel"
              onClick={() => setTab(value)}
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
                tab === value
                  ? "bg-surface text-fg shadow-[var(--shadow-raised)]"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "preview" && (
          <div
            role="group"
            aria-label="Preview width"
            className="hidden items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-1 sm:flex"
          >
            {DEVICES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={device === value}
                title={label}
                onClick={() => setDevice(value)}
                className={`flex h-8 w-9 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 ${
                  device === value
                    ? "bg-surface text-fg shadow-[var(--shadow-raised)]"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={copyCode}
          disabled={!hasOutput}
          // The label is hidden below `sm`, so name the button explicitly.
          aria-label={copied ? "Code copied" : "Copy code"}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? (
            <CheckIcon size={14} className="text-success" />
          ) : (
            <CopyIcon size={14} />
          )}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>

        <DownloadMenu
          disabled={!hasOutput || streaming}
          onSingleFile={download}
          onZip={downloadZip}
        />

        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          disabled={!hasOutput}
          aria-label={fullscreen ? "Exit full screen" : "Full screen preview"}
          title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {fullscreen ? <ShrinkIcon size={14} /> : <ExpandIcon size={14} />}
        </button>
      </div>

      {/* Sideways scrolling is easy to miss in a small preview and impossible
          to miss on a real phone. Name it, and offer the fix. */}
      {tab === "preview" && metrics.overflowBy > 4 && !streaming && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-accent-border bg-accent-soft px-3 py-2">
          <AlertIcon size={15} className="shrink-0 text-accent" />
          <p className="text-xs text-fg">
            This page is{" "}
            <span className="font-semibold tabular-nums">
              {metrics.overflowBy}px
            </span>{" "}
            wider than the {device} viewport, so it scrolls sideways
            {metrics.offenders[0] ? (
              <>
                {" — "}
                <code className="font-mono text-[11px]">
                  {metrics.offenders[0].name}
                </code>{" "}
                is the widest
              </>
            ) : null}
            .
          </p>
          <button
            type="button"
            onClick={askForOverflowFix}
            className="ml-auto shrink-0 cursor-pointer text-xs font-semibold text-accent underline underline-offset-2"
          >
            Ask for a fix
          </button>
        </div>
      )}

      <div
        id="output-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="min-h-0 flex-1"
      >
        {!hasOutput ? (
          <EmptyCanvas streaming={streaming} />
        ) : tab === "compare" && versions.length > 1 ? (
          <CompareView
            versions={versions.map((v) => ({
              id: v.id,
              title: v.title,
              prompt: v.prompt,
            }))}
            htmlFor={(id) => versions.find((v) => v.id === id)?.html ?? ""}
            initialLeftId={versions.at(-2)!.id}
            initialRightId={activeId ?? versions.at(-1)!.id}
          />
        ) : tab === "preview" ? (
          <PreviewFrame
            html={shownHtml}
            device={device}
            title={activeVersion?.title ?? "Website preview"}
            onMeasure={setMetrics}
          />
        ) : (
          <CodeView code={shownCode} streaming={streaming} />
        )}
      </div>
    </section>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <AppNav
        current="build"
        title={activeVersion?.title ?? "New build"}
        subtitle={
          versions.length
            ? `Version ${versions.findIndex((v) => v.id === activeId) + 1} of ${versions.length}${saved ? " · saved" : ""}`
            : undefined
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => void saveToDevice()}
              disabled={!versions.length || streaming || saveState === "saving"}
              aria-label={
                saved ? "Saved to this device" : "Save to this device now"
              }
              title={
                saved
                  ? "Saved automatically to this device"
                  : "Save to this device"
              }
              className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                saved
                  ? "border-accent-border bg-accent-soft text-accent"
                  : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {saveState === "saving" ? (
                <SpinnerIcon size={15} />
              ) : saved ? (
                <CheckIcon size={15} />
              ) : (
                <SaveIcon size={15} />
              )}
              <span className="hidden sm:inline">
                {saveState === "saving"
                  ? "Saving…"
                  : saved
                    ? "Saved"
                    : "Save"}
              </span>
            </button>

            <button
              type="button"
              onClick={startOver}
              disabled={!versions.length && !streaming}
              aria-label="Start a new build"
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PlusIcon size={15} />
              <span className="hidden sm:inline">New</span>
            </button>
          </>
        }
      />

      {/* Capped and centred: edge-to-edge on a wide monitor left the compose
          panel hugging one corner and the preview sitting right of centre. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1700px] flex-1">
        {/* Compose panel --------------------------------------------- */}
        <aside
          className={`w-full min-w-0 shrink-0 flex-col border-border bg-surface lg:flex lg:w-[400px] lg:border-r ${
            pane === "compose" ? "flex" : "hidden"
          }`}
        >
          <div className="scroll-thin flex-1 overflow-y-auto p-4">
            {!hasKey && <SetupNotice className="mb-4" />}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label
                htmlFor="builder-prompt"
                className="flex items-center gap-2 text-sm font-semibold text-fg"
              >
                {isRefine ? <PenIcon size={15} /> : <SparkIcon size={15} />}
                {isRefine
                  ? scopedSection
                    ? `Change the ${scopedSection.label} section`
                    : "Describe a change"
                  : "Describe the site"}
              </label>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                {!isRefine
                  ? "Say who it is for, what it needs to say, and how it should feel."
                  : scopedSection
                    ? "Only this block is rewritten. The rest of the page is copied through untouched — quicker, cheaper, and it cannot break anything else."
                    : "The whole page is rewritten around your change. Everything you do not mention stays as it is."}
              </p>

              {/* Scope. Rewriting one block is the cheap path and the safe one,
                  so it is offered right where the change is described. */}
              {sections.length > 1 && !streaming && (
                <div
                  role="group"
                  aria-label="What to change"
                  className="mt-3 flex flex-wrap gap-1.5"
                >
                  {[{ value: "page", label: "Whole page" }].concat(
                    sections.map((s) => ({
                      value: String(s.index),
                      label: s.label,
                    })),
                  ).map(({ value, label }) => {
                    const active = scope === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setScope(value)}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                          active
                            ? "border-accent-border bg-accent-soft text-accent"
                            : "border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:text-fg"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <textarea
                ref={textareaRef}
                id="builder-prompt"
                rows={isRefine ? 3 : 6}
                maxLength={4000}
                value={input}
                disabled={streaming}
                placeholder={
                  scopedSection
                    ? `Make the ${scopedSection.label.toLowerCase()} clearer and add a third option.`
                    : isRefine
                      ? "Make the hero warmer and add a pricing table with three tiers."
                      : "A landing page for a small-batch coffee roaster in Oslo…"
                }
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="mt-3 block w-full resize-y rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-fg transition-colors duration-150 outline-none focus:border-accent-border disabled:opacity-60"
              />

              <EnhanceBar enhancer={enhancer} className="mt-2" />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <ModelSelect
                  value={model}
                  onChange={setModel}
                  id="builder-model"
                  disabled={streaming}
                />

                {streaming ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-3"
                  >
                    <StopIcon size={14} />
                    Stop
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <EnhanceButton
                      enhancer={enhancer}
                      disabled={!input.trim() || streaming}
                      hint={
                        isRefine
                          ? "Turn this into a precise change, based on the page on screen"
                          : "Rewrite your description into a fuller brief"
                      }
                    />
                    <button
                      type="submit"
                      disabled={
                        !input.trim() || enhancer.enhancing || sectionBusy
                      }
                      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                    >
                      {sectionBusy ? (
                        <SpinnerIcon size={15} />
                      ) : (
                        <SparkIcon size={15} />
                      )}
                      {sectionBusy
                        ? "Rewriting…"
                        : scopedSection
                          ? "Change section"
                          : isRefine
                            ? "Apply change"
                            : "Cast the site"}
                    </button>
                  </div>
                )}
              </div>

              <ModelDescription
                value={model}
                id="builder-model"
                className="mt-2.5"
              />
            </form>

            {/* Live status */}
            {streaming && (
              <div
                role="status"
                aria-live="polite"
                className="animate-in-up mt-4 rounded-xl border border-border bg-surface-2 p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <SpinnerIcon size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-fg">
                    Casting the page…
                  </span>
                  <span className="ml-auto font-mono text-xs text-fg-muted tabular-nums">
                    {(elapsed / 1000).toFixed(1)}s
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-fg-muted">
                  {(streamHtml.length / 1024).toFixed(1)} KB written
                </p>
                {thinking && (
                  <p className="mt-2 line-clamp-2 border-t border-border pt-2 text-xs leading-relaxed text-fg-subtle">
                    {thinking}
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="animate-in-up mt-4 flex gap-3 rounded-xl border border-border bg-surface-2 p-3.5"
              >
                <AlertIcon size={17} className="mt-0.5 shrink-0 text-danger" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    That did not work
                  </p>
                  <p className="mt-1 text-xs leading-relaxed break-words text-fg-muted">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Truncated build — the usual cause of "the page is full of
                errors", so say what happened rather than just badging it. */}
            {!streaming && activeVersion?.partial && (
              <div
                role="status"
                className="mt-4 flex gap-3 rounded-xl border border-accent-border bg-accent-soft p-3.5"
              >
                <AlertIcon size={17} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    This page was cut off
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                    The model ran out of output budget before closing the
                    document, so parts of it will look broken. Switch to Llama
                    3.3 70B, which has the largest allowance, or ask for a
                    shorter page with fewer sections.
                  </p>
                </div>
              </div>
            )}

            {/* Import — only offered before there is anything to lose. */}
            {!versions.length && !streaming && (
              <div className="mt-6 rounded-xl border border-dashed border-border-strong p-4 text-center">
                <p className="text-xs leading-relaxed text-fg-muted">
                  Already have a page? Bring it in and refine it here.
                </p>
                <label className="mt-2.5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 text-xs font-semibold text-fg transition-colors duration-150 hover:bg-surface-3">
                  <UploadIcon size={14} />
                  Import an HTML file
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void importHtml(file);
                    }}
                  />
                </label>
              </div>
            )}

            {activeVersion && !streaming && (
              <ReviewPanel
                findings={review}
                running={reviewRunning}
                error={reviewError}
                onRun={() => void runReview()}
                disabled={!hasKey}
                onApply={(fix) => {
                  setScope("page");
                  enhancer.reset();
                  setInput(fix);
                  setPane("compose");
                  textareaRef.current?.focus();
                }}
              />
            )}

            <HouseStyleEditor
              value={houseStyle}
              onChange={(next) => {
                houseStyleRef.current = next;
                setHouseStyle(next);
              }}
            />

            {/* Versions */}
            {versions.length > 0 && (
              <div className="mt-6">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                  <LayersIcon size={14} />
                  Versions
                </h2>
                <ol className="mt-2.5 space-y-1.5">
                  {versions.map((version, index) => {
                    const active = version.id === activeId;
                    return (
                      <li key={version.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(version.id);
                            setTab("preview");
                            setPane("canvas");
                          }}
                          aria-current={active ? "true" : undefined}
                          className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-colors duration-150 ${
                            active
                              ? "border-accent-border bg-accent-soft"
                              : "border-border bg-surface-2 hover:border-border-strong"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-fg-subtle">
                              v{index + 1}
                            </span>
                            <span className="truncate text-xs font-semibold text-fg">
                              {version.title}
                            </span>
                            {version.partial && (
                              <span className="ml-auto shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                                partial
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-muted">
                            {version.mode === "refine" ? "↳ " : ""}
                            {version.prompt}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </aside>

        {canvas}
      </div>

      {/* Mobile pane switcher ----------------------------------------- */}
      <nav
        aria-label="Panels"
        className="flex h-16 shrink-0 items-center gap-2 border-t border-border bg-surface px-4 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {(
          [
            { value: "compose", label: "Describe", Icon: PenIcon },
            { value: "canvas", label: "Result", Icon: EyeIcon },
          ] as const
        ).map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-current={pane === value ? "page" : undefined}
            onClick={() => setPane(value)}
            className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${
              pane === value
                ? "bg-surface-2 text-fg"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon size={16} />
            {label}
            {value === "canvas" && streaming && (
              <SpinnerIcon size={13} className="text-accent" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function EmptyCanvas({ streaming }: { streaming: boolean }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-xs text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
          {streaming ? (
            <SpinnerIcon size={22} className="text-accent" />
          ) : (
            <LogoMark size={28} />
          )}
        </span>
        <p className="mt-4 text-sm font-semibold text-fg">
          {streaming ? "Warming up…" : "Nothing cast yet"}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          {streaming
            ? "The first lines will appear here in a moment."
            : "Describe the site you want and it will appear here, ready to preview at any width."}
        </p>
      </div>
    </div>
  );
}
