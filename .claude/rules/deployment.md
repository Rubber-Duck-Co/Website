# Deployment & repo safety

- `main` is production: anything pushed to it goes live on GitHub Pages at rubberduckco.co.za.
- Never commit or push directly to `main`, even when asked to "commit". Always create a branch first (e.g. `feature/...`, `fix/...`, `chore/...`), commit there, and get changes into `main` through a pull request.
- No Claude attribution: commit messages must not include a `Co-Authored-By: Claude ...` trailer, and PR descriptions must not include a "🤖 Generated with Claude Code" line or any other AI attribution. Don't add Claude/AI labels to PRs either.

## Pull requests

- PR descriptions must follow the org template at `Rubber-Duck-Co/.github` → `pull_request_template.md`. Fetch the current version before writing a description, rather than working from memory:
  `gh api repos/Rubber-Duck-Co/.github/contents/pull_request_template.md -H "Accept: application/vnd.github.raw"`
- Keep every heading from the template (Summary, Changes, Related Issues, Type of Change, Checklist) in order, and fill each one in:
  - **Summary**: what the PR changes and why, in a sentence or two.
  - **Changes**: one bullet per meaningful change.
  - **Related Issues**: link issues (`Closes #12`), or write `None`.
  - **Type of Change**: tick (`[x]`) every type that applies. The autolabeler workflow reads these boxes, so don't rename, remove, or add options.
  - **Checklist**: tick only items that are actually true. This repo has no tests, so leave "Tests updated and passing" unticked unless tests exist, and say how the change was checked instead (e.g. viewed in a browser).
- Keep the template's HTML comments in place, and don't add sections that aren't in the template.
- Never edit, rename, or delete `CNAME`. It must keep exactly `rubberduckco.co.za`, or the custom domain breaks.
- Keep the site static: no build step, bundler, framework, or `package.json` unless the user asks for one. Files are served as-is from the repo root.
- GitHub Pages runs Jekyll by default, which skips files and folders starting with `_`. Avoid such names, or add an empty `.nojekyll` file if one is needed.
- Use relative asset paths (`style.css`, `img/duck.png`), not root-relative (`/style.css`), so pages work both on the domain and when opened directly from disk.
- Don't add third-party scripts, analytics, trackers, or external CDNs without asking.
- No test suite exists. To verify a change, open `index.html` in a browser (or use the `run` skill) and check it at both phone and desktop widths.
