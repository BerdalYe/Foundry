"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export type Device = "desktop" | "tablet" | "mobile";

export type Offender = { name: string; width: number; hasTable: boolean };

export type PreviewMetrics = {
  /** Pixels by which the page is wider than its viewport; 0 when it fits. */
  overflowBy: number;
  /** The viewport the page was measured against. */
  viewportWidth: number;
  /** The elements actually wider than the viewport, widest-first. */
  offenders: Offender[];
};

/**
 * Real device dimensions, so the narrow modes read as a phone or a tablet
 * rather than an arbitrarily thin column. `height` caps how tall the device
 * gets; it shrinks to fit a short panel.
 */
const DEVICES: Record<
  Device,
  { width: string; height: string | null; radius: number; bezel: number }
> = {
  desktop: { width: "100%", height: null, radius: 10, bezel: 0 },
  tablet: { width: "834px", height: "1112px", radius: 24, bezel: 10 },
  mobile: { width: "390px", height: "844px", radius: 38, bezel: 11 },
};

export const DEVICE_WIDTH: Record<Device, string> = {
  desktop: DEVICES.desktop.width,
  tablet: DEVICES.tablet.width,
  mobile: DEVICES.mobile.width,
};

/**
 * A srcDoc document has no URL of its own: it resolves every link against the
 * PARENT page. So `<a href="/">`, an empty `href`, a form with no `action` —
 * and, less obviously, a plain `<a href="#pricing">` — all navigate the iframe
 * to Foundry itself, which then renders unstyled inside the preview because the
 * sandbox gives it an opaque origin.
 *
 * Fragment links are the common case: almost every generated page has a nav
 * built from them. So no link is allowed to navigate the frame at all, and
 * same-page jumps are performed here instead, by scrolling to the target.
 *
 * Capture phase + preventDefault only, so the page's own click and submit
 * handlers still run — mobile menus, tabs and accordions behave normally.
 *
 * Injected into the preview only. Copy and Download always use the untouched
 * document.
 */
const NAVIGATION_GUARD = `<script data-foundry-preview-guard>(function(){
  // Announce that this really is the generated document. If a load happens
  // without this, the frame navigated somewhere else and the parent restores it.
  function hello() {
    try { parent.postMessage({ source: 'foundry-preview', hello: true }, '*'); } catch (e) {}
  }
  hello();
  window.addEventListener('DOMContentLoaded', hello);
  window.addEventListener('load', hello);

  function scrollTo(target) {
    var reduce = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  // On window, not document: capture runs window-first, so a page script that
  // captures on document and calls stopPropagation cannot shut this out.
  window.addEventListener('click', function (event) {
    var el = event.target;
    var link = el && el.closest ? el.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';

    // Nothing may navigate the frame; the preview is not a browser tab.
    event.preventDefault();
    if (href.charAt(0) !== '#') return;

    var id = href.slice(1);
    if (!id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    try {
      var target = document.getElementById(id)
        || document.querySelector('a[name="' + id.replace(/"/g, '\\\\"') + '"]');
      if (target) scrollTo(target);
    } catch (e) {}
  }, true);
  window.addEventListener('submit', function (event) {
    event.preventDefault();
  }, true);

  // Sideways scrolling is the defect people notice last and hate most, and it
  // is invisible from out here — the sandbox makes the document unreadable to
  // the parent. So the page measures itself, works out which elements are too
  // wide, and posts both out. Naming the culprit turns a vague complaint into
  // an instruction a model can actually act on.
  function offenders(vw) {
    var found = [], all = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < all.length && found.length < 3; i++) {
      var el = all[i], r = el.getBoundingClientRect();
      if (r.width <= vw + 1) continue;
      var name = el.tagName.toLowerCase();
      if (el.id) name += '#' + el.id;
      else if (typeof el.className === 'string' && el.className.trim())
        name += '.' + el.className.trim().split(/\\s+/)[0];
      found.push({
        name: name,
        width: Math.round(r.width),
        hasTable: !!el.querySelector('table')
      });
    }
    return found;
  }
  function report() {
    var de = document.documentElement;
    try {
      var vw = de.clientWidth;
      parent.postMessage({
        source: 'foundry-preview',
        scrollWidth: de.scrollWidth,
        clientWidth: vw,
        offenders: de.scrollWidth > vw ? offenders(vw) : []
      }, '*');
    } catch (e) {}
  }
  window.addEventListener('load', report);
  window.addEventListener('resize', report);
  // Late images and webfonts change the answer, so measure again after them.
  setTimeout(report, 400);
  setTimeout(report, 1800);
})();</script>`;

/**
 * Phones and tablets overlay their scrollbars; a desktop scrollbar gutter both
 * spoils the device illusion and steals ~15px, which would make the preview
 * report a narrower viewport than the device really has. Only the root element
 * is targeted, so the page's own scrolling containers keep their scrollbars.
 */
const HIDE_ROOT_SCROLLBAR = `<style data-foundry-preview-guard>html{scrollbar-width:none}html::-webkit-scrollbar{width:0;height:0}</style>`;

function guard(html: string): string {
  if (!html) return html;
  const injection = NAVIGATION_GUARD + HIDE_ROOT_SCROLLBAR;
  const close = html.toLowerCase().lastIndexOf("</body>");
  // After the page's own scripts, so nothing it defines is shadowed.
  return close === -1
    ? html + injection
    : html.slice(0, close) + injection + html.slice(close);
}

/**
 * Generated pages run inside a sandbox with `allow-scripts` but deliberately
 * WITHOUT `allow-same-origin`. That combination gives the document an opaque
 * origin: its scripts still run, so interactions can be tested, but they cannot
 * reach Foundry's DOM, cookies or storage.
 */
export function PreviewFrame({
  html,
  device,
  title = "Website preview",
  onMeasure,
}: {
  html: string;
  device: Device;
  title?: string;
  onMeasure?: (metrics: PreviewMetrics) => void;
}) {
  const guarded = useMemo(() => guard(html), [html]);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastHelloRef = useRef(0);
  const restoresRef = useRef(0);

  // Nothing should be able to navigate the frame, but generated JavaScript is
  // inventive — `location.href = "#x"` resolves against the parent URL and
  // leaves Foundry rendering unstyled inside the preview. Rather than chase
  // every route out, notice when the document on screen is no longer ours and
  // put it back.
  useEffect(() => {
    restoresRef.current = 0;
  }, [guarded]);

  const handleLoad = useCallback(() => {
    const sinceHello = Date.now() - lastHelloRef.current;
    if (sinceHello < 1500) return; // Our own document announced itself.

    window.setTimeout(() => {
      if (Date.now() - lastHelloRef.current < 1500) return;
      const frame = frameRef.current;
      // Cap the retries: a page that navigates on every load would loop.
      if (!frame || restoresRef.current >= 2) return;
      restoresRef.current += 1;
      frame.srcdoc = guarded;
    }, 400);
  }, [guarded]);

  useEffect(() => {
    const notify = onMeasure;
    if (!notify) return;

    // An arrow const, not a declaration: hoisting a declaration above the
    // guard above would discard the narrowing of `notify`.
    const onMessage = (event: MessageEvent) => {
      // The frame has an opaque origin, so identity is established by comparing
      // the source window, not by origin. Everything read from it is coerced.
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.source !== "foundry-preview") return;

      // Any message from the guard proves the real document is still loaded.
      lastHelloRef.current = Date.now();
      if (data.hello) return;

      const scrollWidth = Number(data.scrollWidth);
      const clientWidth = Number(data.clientWidth);
      if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth)) return;

      const raw = Array.isArray(data.offenders) ? data.offenders : [];
      const offenders: Offender[] = raw.slice(0, 3).map((item) => {
        const o = (item ?? {}) as Record<string, unknown>;
        return {
          name: String(o.name ?? "element").slice(0, 40),
          width: Math.round(Number(o.width)) || 0,
          hasTable: Boolean(o.hasTable),
        };
      });

      notify({
        overflowBy: Math.max(0, Math.round(scrollWidth - clientWidth)),
        viewportWidth: Math.round(clientWidth),
        offenders,
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMeasure]);

  // Clear the old measurement the moment the page or the width changes, so a
  // stale warning never sits over a page it no longer describes. The frame
  // re-measures and reports the real figure a moment later.
  useEffect(() => {
    onMeasure?.({ overflowBy: 0, viewportWidth: 0, offenders: [] });
  }, [guarded, device, onMeasure]);

  const spec = DEVICES[device];
  const isDesktop = device === "desktop";

  return (
    <div
      className={`flex h-full justify-center overflow-auto ${
        isDesktop ? "bg-surface-3 p-0 sm:p-4" : "bg-canvas items-center p-4 sm:p-6"
      }`}
    >
      {/* The bezel. Giving the narrow modes a real device shape stops them
          reading as a stray column floating in empty space. */}
      <div
        className={`shrink-0 overflow-hidden transition-[width,height] duration-200 ease-out ${
          isDesktop
            ? "h-full w-full"
            : "border border-border-strong bg-surface shadow-[var(--shadow-modal)]"
        }`}
        style={
          isDesktop
            ? undefined
            : {
                // content-box so `width` is the viewport the page actually
                // gets — the bezel must not eat into it, or 390 becomes 366
                // and the preview lies about the device.
                boxSizing: "content-box",
                width: spec.width,
                height: spec.height ?? "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                borderRadius: spec.radius,
                padding: spec.bezel,
              }
        }
      >
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={guarded}
          sandbox="allow-scripts allow-forms allow-modals"
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={handleLoad}
          className={`h-full w-full border-0 bg-white ${
            isDesktop ? "sm:rounded-lg" : ""
          }`}
          style={
            isDesktop
              ? undefined
              : { borderRadius: Math.max(spec.radius - spec.bezel, 4) }
          }
        />
      </div>
    </div>
  );
}
