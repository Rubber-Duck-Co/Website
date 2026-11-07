---
paths:
  - "**/*.js"
---

# JavaScript conventions

- Only add JavaScript when a feature actually needs it. The page must still render and read correctly with JS disabled; scripts only enhance it.
- Vanilla, modern JS that runs directly in the browser: no frameworks, bundlers, transpilers, TypeScript, or npm packages unless the user asks. Use only features that current evergreen browsers support natively.
- Keep scripts in separate `.js` files, loaded with `<script src="..." defer>` or `type="module"`. ES module imports use relative paths that include the `.js` extension.
- Use `const` by default and `let` only when a value is reassigned; never `var`. Use strict equality (`===`).
- No globals: use ES modules, or wrap code in a block scope.
- Select elements with `querySelector` / `querySelectorAll` and attach behaviour with `addEventListener`. Prefer `data-*` attributes over styling classes as JS hooks.
- Set text with `textContent`, not `innerHTML`, unless the content is static markup you control. Never insert user input or API responses as HTML.
- Toggle classes or attributes for visual changes, and keep the styles themselves in CSS.
- Respect `prefers-reduced-motion` for anything animated, and keep interactive elements keyboard-accessible (real `<button>`s, visible focus, ARIA state where needed).
- All code ships to the browser and is public: no API keys, tokens, or secrets. Call external APIs only over HTTPS, and only ones that allow cross-origin requests.
- Handle failed `fetch()` calls and missing elements gracefully rather than throwing.
- Wrap `localStorage` access in `try`/`catch`, since it can be unavailable.
- Don't load third-party scripts, analytics, or trackers without asking.
- No `console.log` left behind in committed code.
- Match the existing style (2-space indentation, semicolons, and double quotes by default).
