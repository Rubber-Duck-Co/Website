---
paths:
  - "**/*.css"
---

# CSS conventions

- Plain CSS in the single `style.css`: no preprocessors, frameworks (Tailwind, Bootstrap), or CSS-in-JS.
- Brand palette: background `#ffd93b` (duck yellow), text `#222`. When adding colors, define them as custom properties on `:root` and keep text contrast at WCAG AA or better.
- Typography: keep the system font stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) unless the user asks for a web font. Use `clamp()` for fluid font sizes, as the existing rules do.
- Layout is mobile-first: base styles for small screens, `min-width` media queries for larger ones. Never cause horizontal scrolling at 320px width.
- Prefer `rem`/`em` and relative units over fixed `px` for sizes and spacing.
- Respect `prefers-reduced-motion` for any animation or transition.
- Use 2-space indentation and one declaration per line, matching the existing file.
