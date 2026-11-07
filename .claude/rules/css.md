---
paths:
  - "**/*.css"
---

# CSS conventions

- Plain CSS served as-is: no preprocessors (Sass, Less), frameworks (Tailwind, Bootstrap), PostCSS, or CSS-in-JS unless the user asks. Use only features supported by current evergreen browsers, since nothing is transpiled.
- Keep the number of stylesheets small: a shared stylesheet plus page-specific files only when they're really needed. Avoid `@import`, which loads files one after another.
- Define design tokens (colours, spacing, font sizes, radii) as custom properties on `:root`, and reuse them rather than hard-coding values. Text contrast must meet WCAG AA or better.
- Use the system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) unless the user asks for a web font. Self-host any web font and use `font-display: swap`.
- Build mobile-first: base styles for small screens, `min-width` media queries for larger ones. The page must never scroll horizontally at 320px width.
- Use Flexbox and Grid for layout, `clamp()` for fluid type and spacing, and `rem`/`em`/`%` units over fixed `px`.
- Keep specificity low: use class selectors, avoid IDs and deep nesting, and avoid `!important`.
- Never remove focus outlines without a visible replacement. Use `:focus-visible`.
- Wrap animations and transitions in a `prefers-reduced-motion` check, and animate `transform` and `opacity` rather than layout properties.
- `url()` paths resolve relative to the CSS file, not the page.
- Match the indentation of the existing files (2 spaces by default), with one declaration per line.
