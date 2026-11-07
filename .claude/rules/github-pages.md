# GitHub Pages hosting

The site is plain static files served by GitHub Pages. Every change has to work within what Pages can do.

## Static only

- Pages serves files exactly as they are in the repo. There's no server-side code (PHP, Node, Python), no database, and no runtime environment variables.
- Keep the site static: no build step, bundler, framework, or `package.json` unless the user asks for one.
- Anything dynamic runs as client-side JS calling external HTTPS APIs. Forms, comments, search backends, and similar features need a third-party service, so ask before adding one.
- Everything in the published folder is public, including source maps, drafts, and data files. Never commit secrets, API keys, `.env` files, or private data. Client-side code can't hide a key.

## Jekyll

- By default, Pages runs Jekyll before publishing. Jekyll skips files and folders that start with `_` or `.`, and it processes any file that has YAML front matter.
- Avoid names that start with `_`. If one is needed, add an empty `.nojekyll` file at the root.
- With `.nojekyll` in place, dot-folders such as `.claude/` and `.github/` become publicly reachable, so check that they hold nothing sensitive.

## No server configuration

- You can't set HTTP headers (CSP, CORS, cache, security headers). If a Content Security Policy is needed, use `<meta http-equiv="Content-Security-Policy">`.
- Caching is fixed at about 10 minutes (`max-age=600`), so deployed changes can take a few minutes to appear. When an asset has to update immediately, change its URL, for example with `style.css?v=2` or a new filename.
- There are no server-side redirects or rewrites. For a moved page, leave a stub at the old path containing `<meta http-equiv="refresh" content="0; url=new-page.html">` and a `<link rel="canonical">`.
- There's no SPA history fallback. Give each page its own real `.html` file (preferred), or use hash routing.

## URLs and files

- `folder/index.html` is served at `/folder/`, and `page.html` is also served at `/page`.
- Paths are case-sensitive on Pages but not on Windows or macOS, so a link that works locally can 404 once deployed. Use lowercase, hyphenated file and folder names with no spaces, and match the case exactly in every reference.
- Use relative asset paths (`css/style.css`), not root-relative ones (`/css/style.css`). Relative paths work on a custom domain, on a project subpath (`user.github.io/repo/`), and from a local server.
  - Exception: `404.html` can be served at any depth, so its asset links must be root-relative (or absolute) to resolve.
- A custom `404.html` at the root replaces GitHub's default error page.
- `robots.txt`, `sitemap.xml`, and favicons go at the site root. Absolute URLs (canonical, Open Graph, sitemap) use the domain in `CNAME`.
- Never edit, rename, or delete `CNAME`. It holds the custom domain, and changing it breaks the site.

## HTTPS and limits

- The site is HTTPS-only, so every external resource must use `https://`. Mixed content is blocked.
- Limits: published site ≤ 1 GB, individual files ≤ 100 MB (GitHub warns above 50 MB), and a soft bandwidth limit of 100 GB per month.
  - Optimise images before committing: SVG for graphics, WebP or AVIF for photos (with a fallback if needed), sized to their display dimensions.
  - Host large video and audio elsewhere rather than committing them.
- Don't add third-party scripts, analytics, trackers, web fonts, or external CDNs without asking.

## Verifying

- No test suite exists. To check a change, serve the repo root with a local static server, because ES modules and `fetch()` don't work over `file://`. For example, run `python -m http.server 8000` and open `http://localhost:8000`, or use the `run` skill.
- Check every change at phone width (320–390px) and desktop width, and check the browser console for errors and 404s.
- After a merge to `main`, `gh run list --workflow "pages-build-deployment"` shows whether the deploy succeeded.
