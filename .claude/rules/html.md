---
paths:
  - "**/*.html"
---

# HTML conventions

## Page structure

- Every page has `<!DOCTYPE html>`, `<html lang="...">`, `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, a unique and meaningful `<title>`, and a `<meta name="description">`.
- Add favicon and Open Graph/social meta tags when creating a new page, and keep them consistent across pages.
- Use semantic elements (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`). Each page has exactly one `main`, one `h1`, and headings in order with no skipped levels.
- Shared parts (header, nav, footer) are copied into each page because there are no includes. When one changes, update every page.

## Accessibility

- Every `<img>` has an `alt` attribute (`alt=""` for decorative images) plus `width` and `height` to prevent layout shift. Use `loading="lazy"` for images below the fold.
- Use links (`<a href>`) for navigation and `<button>` for actions. Never put click handlers on a `div` or `span`.
- Every form control has an associated `<label>`. Use the correct `type` and `autocomplete` attributes on inputs.
- Use ARIA only when native HTML can't express something. Add a "skip to content" link when the page has a navigation block.
- Links that open a new tab use `rel="noopener"` and say so to the user.

## Assets and code

- Link stylesheets from `<head>`. No inline `style` attributes or `<style>` blocks, and no inline `<script>` blocks or `on*` attributes. Separate files keep the code reusable and a meta-tag CSP possible.
- Load scripts with `defer` or `type="module"`, and make sure the page still works without them (see `js.md`).
- Use relative paths for internal links and assets, matching the exact case of the file name (see `github-pages.md`).
- Match the indentation of the existing files (2 spaces by default).
