"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Reveal } from "@/components/reveal";
import {
  AlertIcon,
  ArrowRightIcon,
  DownloadIcon,
  LibraryIcon,
  PenIcon,
  SearchIcon,
  SparkIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/icons";
import {
  deleteProject,
  listProjects,
  renameProject,
  type SavedProject,
} from "@/lib/library";
import { slugify } from "@/lib/html";

function when(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function LibraryView() {
  const [projects, setProjects] = useState<SavedProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SavedProject | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const load = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError((err as Error)?.message ?? "Could not read saved sites.");
      setProjects([]);
    }
  }, []);

  // Reading IndexedDB on mount is exactly what an effect is for, and `load`
  // only touches state after awaiting — nothing here is synchronous, so it
  // cannot cascade. The rule cannot see past the async boundary.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!projects) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.versions.some((v) => v.prompt.toLowerCase().includes(needle)),
    );
  }, [projects, query]);

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await deleteProject(target.id);
      setProjects((prev) => prev?.filter((p) => p.id !== target.id) ?? null);
    } catch (err) {
      setError((err as Error)?.message ?? "Could not delete that site.");
    }
  }

  async function commitRename(project: SavedProject) {
    const title = draftTitle.trim();
    setRenaming(null);
    if (!title || title === project.title) return;
    try {
      const updated = await renameProject(project.id, title);
      if (updated) {
        setProjects(
          (prev) => prev?.map((p) => (p.id === project.id ? updated : p)) ?? null,
        );
      }
    } catch (err) {
      setError((err as Error)?.message ?? "Could not rename that site.");
    }
  }

  function download(project: SavedProject) {
    const version =
      project.versions.find((v) => v.id === project.activeVersionId) ??
      project.versions.at(-1);
    if (!version) return;
    const blob = new Blob([version.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(project.title)}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppNav
        current="library"
        actions={
          <Link
            href="/build"
            aria-label="Build a new site"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
          >
            <SparkIcon size={15} />
            <span className="hidden sm:inline">New site</span>
          </Link>
        }
      />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              Saved on this device
            </h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              {projects === null
                ? "Reading your library…"
                : projects.length === 0
                  ? "Nothing saved yet."
                  : `${projects.length} site${projects.length === 1 ? "" : "s"}, stored in this browser only.`}
            </p>
          </div>

          {projects !== null && projects.length > 0 && (
            <div className="relative">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
              />
              <label htmlFor="library-search" className="sr-only">
                Search saved sites
              </label>
              <input
                id="library-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-fg transition-colors duration-150 outline-none placeholder:text-fg-subtle focus:border-accent-border sm:w-56"
              />
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="animate-in-up mt-6 flex gap-3 rounded-xl border border-border bg-surface-2 p-4"
          >
            <AlertIcon size={17} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm leading-relaxed text-fg-muted">{error}</p>
          </div>
        )}

        {projects === null && !error && (
          <div className="mt-16 flex justify-center">
            <SpinnerIcon size={22} className="text-fg-subtle" />
          </div>
        )}

        {visible !== null && visible.length === 0 && (
          <EmptyLibrary searching={query.trim().length > 0} />
        )}

        {visible !== null && visible.length > 0 && (
          <ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((project, index) => {
              const version =
                project.versions.find((v) => v.id === project.activeVersionId) ??
                project.versions.at(-1);

              return (
                <Reveal
                  as="li"
                  key={project.id}
                  delay={Math.min(index * 45, 270)}
                  className="lift overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <Link
                    href={`/build?project=${project.id}`}
                    className="block"
                    aria-label={`Open ${project.title}`}
                  >
                    <div className="pointer-events-none h-44 overflow-hidden border-b border-border bg-white">
                      {version && (
                        <iframe
                          title=""
                          aria-hidden="true"
                          tabIndex={-1}
                          srcDoc={version.html}
                          // No allow-scripts: a thumbnail only needs the CSS,
                          // and dozens of live scripts would cost far more.
                          sandbox=""
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="h-[880px] w-[1100px] origin-top-left border-0"
                          style={{ transform: "scale(0.34)" }}
                        />
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    {renaming === project.id ? (
                      <input
                        autoFocus
                        value={draftTitle}
                        maxLength={80}
                        aria-label="Site name"
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onBlur={() => void commitRename(project)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRename(project);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="w-full rounded-lg border border-accent-border bg-surface-2 px-2 py-1 text-sm font-semibold text-fg outline-none"
                      />
                    ) : (
                      <h2 className="truncate text-sm font-semibold text-fg">
                        {project.title}
                      </h2>
                    )}

                    <p className="mt-1 text-xs text-fg-muted">
                      {project.versions.length} version
                      {project.versions.length === 1 ? "" : "s"} ·{" "}
                      {when(project.updatedAt)}
                    </p>

                    <div className="mt-3.5 flex items-center gap-1">
                      <Link
                        href={`/build?project=${project.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-2 px-3 text-xs font-semibold text-fg transition-colors duration-150 hover:bg-surface-3"
                      >
                        Open
                        <ArrowRightIcon size={13} />
                      </Link>

                      <div className="ml-auto flex items-center gap-0.5">
                        <IconAction
                          label={`Rename ${project.title}`}
                          onClick={() => {
                            setDraftTitle(project.title);
                            setRenaming(project.id);
                          }}
                        >
                          <PenIcon size={14} />
                        </IconAction>
                        <IconAction
                          label={`Download ${project.title}`}
                          onClick={() => download(project)}
                        >
                          <DownloadIcon size={14} />
                        </IconAction>
                        <IconAction
                          label={`Delete ${project.title}`}
                          danger
                          onClick={() => setPendingDelete(project)}
                        >
                          <TrashIcon size={14} />
                        </IconAction>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this site?"
        body={`"${pendingDelete?.title ?? ""}" and all of its versions will be removed from this device. This cannot be undone.`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 ${
        danger
          ? "text-fg-muted hover:bg-surface-2 hover:text-danger"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyLibrary({ searching }: { searching: boolean }) {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle">
        <LibraryIcon size={22} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-fg">
        {searching ? "Nothing matches that" : "Your library is empty"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
        {searching
          ? "Try a different word, or clear the search to see everything."
          : "Every site you build is saved here automatically, on this device. They survive closing the browser."}
      </p>
      {!searching && (
        <Link
          href="/build"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
        >
          <SparkIcon size={15} />
          Build a site
        </Link>
      )}
    </div>
  );
}
