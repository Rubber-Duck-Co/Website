---
paths:
  - "**/*.html"
---

# HTML conventions

- Every page keeps `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="UTF-8">`, the viewport meta tag, and a meaningful `<title>`.
- Use semantic elements (`main`, `header`, `nav`, `section`, `footer`) with one `h1` per page and headings in order.
- Link the shared `style.css`; no inline `style` attributes or `<style>` blocks.
- Every `<img>` gets an `alt` attribute (empty `alt=""` for decorative images) plus `width`/`height` to avoid layout shift.
- Keep JavaScript out unless a feature needs it. When it does, put it in a separate `.js` file loaded with `defer` or `type="module"` (see `js.md`), and make sure the page still works without it.
- Use 2-space indentation, matching `index.html`.
