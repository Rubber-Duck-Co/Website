---
paths:
  - "**/*.js"
---

# JavaScript conventions

- Only add JavaScript when a feature actually needs it. The page must still render and read correctly with JS disabled; scripts only enhance it.
- Vanilla, modern JS that runs directly in the browser: no frameworks, bundlers, transpilers, TypeScript, or npm packages unless the user asks.
- Keep scripts in separate `.js` files, loaded with `<script src="..." defer>` or `type="module"`. No inline `<script>` blocks or `on*` attributes.
- Use `const` by default and `let` only when a value is reassigned; never `var`. Use strict equality (`===`).
- No globals: use ES modules, or wrap code in a block scope.
- Select elements with `querySelector` / `querySelectorAll` and attach behaviour with `addEventListener`. Prefer `data-*` attributes over styling classes as JS hooks.
- Set text with `textContent`, not `innerHTML`, unless the content is static markup you control.
- Toggle classes or attributes for visual changes, and keep the styles themselves in `style.css`.
- Respect `prefers-reduced-motion` for anything animated, and keep interactive elements keyboard-accessible (real `<button>`s, visible focus, ARIA state where needed).
- Don't load third-party scripts, analytics, or trackers from CDNs without asking.
- No `console.log` left behind in committed code.
- Use 2-space indentation, semicolons, and double quotes, consistent with the HTML/CSS style.
