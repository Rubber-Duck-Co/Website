# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Company site for Rubber Duck Co (rubberduckco.co.za): a static GitHub Pages site whose main job is hosting the BrassCount Android app's privacy policy for Google Play. Conventions for HTML, CSS, JS, Pages hosting and deployment/PRs live in `.claude/rules/*.md`; follow those rather than restating them here.

## Commands

There is no build, lint or test step. Preview by serving the repo root over HTTP (ES modules don't load from `file://`):

```sh
npx http-server -p 8000   # or: python -m http.server 8000 (Python isn't installed on this machine)
```

## Structure

- `index.html`, `privacy.html`, `404.html` share a copied header and footer. Change one, change all three. `404.html` uses root-relative paths (`/assets/...`) because Pages serves it at any depth; the other pages use relative paths.
- `privacy.html` is the URL registered with Google Play. Keep it at that path, and keep it accurate: BrassCount's only permission is the microphone, it collects nothing, and the website's only storage is the brass pile in `localStorage`. If site or app behaviour changes, update the policy and its effective date.
- Everything else lives in `assets/` (css, js, fonts, img, icons). The favicons sit in `assets/icons/` on purpose, even though `github-pages.md` says site root.
- Logos and favicons come from the "Logo System" page of the Claude Design canvas https://claude.ai/artifact/UE1RRGGLNQR1H3bgpsNgLA. Copy the artboard SVG geometry exactly rather than redrawing. The PNG icons and `assets/img/og.png` were rendered from those SVGs with headless Edge.

## The brass simulation (`assets/js/`)

`main.js` wires the page up: firing on click or tap (mouse fires on `pointerdown` and auto-fires while held; touch uses `click` so scrolling doesn't fire), the header controls (`data-brass-*` hooks, `hidden` until JS runs), and milestone toasts. `sound.js` synthesizes all audio with WebAudio, and `duck.js` makes the hero duck squeak.

`brass.js` is the physics. Key ideas that span the file:

- **Ledges.** Every surface is a strip of 4px bins. `base[i]` is the surface's own shape and `level[i]` is the current surface including brass. Both are offsets below the ledge's `top`, and `Infinity` means no surface (gaps between words, outside the duck).
  - The floor is screen-anchored, at the bottom of the viewport.
  - Elements marked `[data-solid]` become page-anchored ledges. Text gets one ledge per line, with per-glyph tops measured via canvas `measureText`. The duck (`data-solid="duck"`) gets its outline from the `[data-hull]` shapes using `isPointInFill`/`isPointInStroke`.
- **Casings are flying or sliding.** Flying ones get gravity, spin and bounces. Below `SETTLE_SPEED` a casing slides along its ledge (gravity downhill, friction), drops off edges, and settles only where the slope is at most `STATIC_SLOPE`. Headlines and the duck hold one layer of brass, so extra casings get pushed off.
- **Piles are sandpiles.** On settling, `deposit()` adds material and `relax()` slumps anything steeper than `REPOSE` downhill. Only the brass moves, never `base`. Settled floor casings are baked into an offscreen canvas.
- **Persistence.** `localStorage` keys are `rdc-brass` (count plus the last 400 floor casings as x-fractions, replayed on load and resize) and `rdc-sound`.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, casings skip flight and are placed straight onto the pile via `rollDownhill()`. The owner's Windows has animation effects off, so the flying version only shows with that setting changed or emulated in DevTools.
- **Rebuilds.** A `ResizeObserver` watches `<main>`, not `<body>`, because the pile sets `--pile-height` (the footer's bottom padding). Observing `<body>` makes every landing rebuild the ledges and knock brass off the headlines. A window resize rebuilds everything, and a rebuild drops any brass resting on headlines.
