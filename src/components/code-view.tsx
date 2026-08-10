"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";

/** Above this, highlighting costs more than it gives. Plain text instead. */
const HIGHLIGHT_LIMIT = 150_000;

/**
 * Builds React nodes rather than an HTML string — there is no
 * dangerouslySetInnerHTML anywhere near model output, so mis-tokenising can
 * only ever look wrong, never execute.
 */
function highlight(source: string) {
  // Built per call: a shared /g regex carries `lastIndex` between calls.
  const node = /(<!--[\s\S]*?-->)|(<[!/]?[a-zA-Z][^>]*>)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  let match: RegExpExecArray | null;

  while ((match = node.exec(source)) !== null) {
    if (match.index > last) {
      out.push(source.slice(last, match.index));
    }

    if (match[1]) {
      out.push(
        <span key={key++} className="text-fg-subtle italic">
          {match[1]}
        </span>,
      );
    } else {
      out.push(<Tag key={key++} raw={match[2]} />);
    }

    last = match.index + match[0].length;
  }

  if (last < source.length) out.push(source.slice(last));
  return out;
}

function Tag({ raw }: { raw: string }) {
  // `<div`, `</div`, `<!DOCTYPE` — everything up to the first space or close.
  const nameEnd = /^<[!/]?[\w:-]*/.exec(raw)?.[0].length ?? raw.length;
  const name = raw.slice(0, nameEnd);
  const body = raw.slice(nameEnd);

  const attr = /([\w:@.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  let m: RegExpExecArray | null;
  while ((m = attr.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <Fragment key={key++}>
        <span className="text-fg-muted">{m[1]}</span>
        {m[2]}
        <span className="text-syntax-string">{m[3]}</span>
      </Fragment>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));

  return (
    <span className="text-fg-subtle">
      <span className="font-medium text-accent">{name}</span>
      {parts}
    </span>
  );
}

export function CodeView({
  code,
  streaming = false,
}: {
  code: string;
  streaming?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // While streaming, stay pinned to the newest line.
  useEffect(() => {
    if (!streaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [code, streaming]);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  // Highlighting a document that is still growing would re-tokenise on every
  // chunk, so it waits until the stream settles.
  const content = useMemo(() => {
    if (streaming || code.length > HIGHLIGHT_LIMIT) return code;
    return highlight(code);
  }, [code, streaming]);

  return (
    <div
      ref={scrollRef}
      className="scroll-thin h-full overflow-auto bg-surface-2"
    >
      <div className="flex min-h-full font-mono text-[12.5px] leading-[1.65]">
        <div
          aria-hidden="true"
          className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface-2 px-3 py-4 text-right text-fg-subtle select-none"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="min-w-0 flex-1 px-4 py-4 whitespace-pre text-fg">
          <code>
            {content}
            {streaming && <span className="caret-blink" />}
          </code>
        </pre>
      </div>
    </div>
  );
}
