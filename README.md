# Foundry

**Build a website by describing it.**

Write a sentence about the site you want. Foundry sends it to a model on Groq
and streams back one complete, self-contained HTML document — responsive, dark
mode included, real copy rather than lorem ipsum. Preview it at phone, tablet
and desktop widths, refine it in plain English, and download the file.

## Getting started

```bash
npm install
```

Put a Groq API key in `.env.local` (copy `.env.example` if it is missing):

```
GROQ_API_KEY=gsk_...
```

Free keys: [console.groq.com/keys](https://console.groq.com/keys). Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it fits together

| Path                          | What it does                                                    |
| ----------------------------- | --------------------------------------------------------------- |
| `src/app/page.tsx`            | Landing page. The hero composer is the product's front door.     |
| `src/app/build/page.tsx`      | The builder. Server component; only passes down whether a key exists. |
| `src/app/library/page.tsx`    | Sites saved on the device — open, rename, download, delete.      |
| `src/lib/library.ts`          | The IndexedDB store behind the library. Nothing leaves the browser. |
| `src/app/api/generate/route.ts` | Streams Groq's output to the browser as newline-delimited JSON. |
| `src/app/api/enhance/route.ts` | Rewrites a short description into a full brief before building. |
| `src/lib/groq.ts`             | `server-only`. Holds the key, parses Groq's SSE frames.          |
| `src/lib/prompt.ts`           | The system prompts — the design rules every generated page follows. |
| `src/lib/html.ts`             | Pulls a clean document out of whatever the model actually emitted. |
| `src/app/globals.css`         | Semantic colour tokens for light and dark. No raw hex in components. |

## Notes on how it behaves

- **The key stays on the server.** `GROQ_API_KEY` is read in a `server-only`
  module and in Server Components. The browser is told whether a key exists,
  never what it is.
- **Short descriptions get improved first.** "make a racing website" gives a
  model nothing to design around, which is where bad pages come from. Improve
  rewrites it into a brief with sections, tone, palette and specifics. It runs
  on a different model from the build so it does not eat the build's token
  allowance, and it is always undoable.
- **Generated pages are sandboxed.** The preview iframe gets `allow-scripts`
  but deliberately not `allow-same-origin`, so generated JavaScript runs in an
  opaque origin and cannot touch Foundry's DOM, cookies or storage.
- **Device modes are real dimensions.** Mobile is a true 390×844 viewport and
  tablet 834×1112, framed in a bezel on a canvas so they read as devices. The
  bezel is `content-box`, so it cannot steal pixels from the viewport, and the
  root scrollbar is hidden in the preview the way a phone hides it — otherwise
  the gutter would cost ~15px and the preview would lie about the width. Only
  the root scrollbar; the page's own scrolling containers keep theirs.
- **The preview measures itself.** The sandbox makes the generated document
  unreadable from outside, so the injected script reports its own width back by
  `postMessage`. When a page is wider than the viewport, the builder says by how
  many pixels and which element is at fault, and can fill the change box with an
  instruction naming it. Vague "make it responsive" requests do not work;
  "section#events is 388px wide and contains a table" does.
- **Nothing in the preview can navigate.** A `srcDoc` document resolves links
  against the parent page, so even `<a href="#pricing">` would load Foundry
  inside the preview. `preview-frame.tsx` injects a guard that cancels every
  link and form navigation and performs same-page jumps by scrolling. It is
  added to the preview only — Copy and Download give you the original file.
- **Nothing is stored server-side.** Unsaved work lives in the tab's
  `sessionStorage` (last 8 versions) and disappears when it closes. Press Save
  and the whole project — every version — goes to IndexedDB on the device,
  where it survives closing the browser. Once saved, later versions are written
  automatically. Still nothing leaves the machine.
- **Streaming is interruptible.** Stop mid-cast and whatever arrived is kept as
  a version, marked `partial`.

## Changing the house style

Every generated page follows the rules in `src/lib/prompt.ts` — palette from
CSS custom properties, `prefers-color-scheme` dark mode, mobile-first
breakpoints, 4.5:1 contrast, inline SVG icons, no external CSS frameworks. Edit
that file to change what Foundry produces.

Foundry's own look comes from the tokens at the top of `src/app/globals.css`.
Light and dark are authored as a pair; both sides are contrast-checked.

## Stack

Next.js 16 (App Router, Turbopack), React 19.2, Tailwind CSS v4, TypeScript.
No UI library — the components in `src/components` are the whole system.
