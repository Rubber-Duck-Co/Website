# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static placeholder site for Rubber Duck Co (`rubberduckco.co.za`, set in `CNAME`), apparently hosted via GitHub Pages. It is currently a "WIP" landing page: `index.html` plus a single `style.css`. There is no build step, package manager, linter, or test suite — edit the files and open `index.html` in a browser.

## Notes

- Deployment is implicit: pushing to `main` publishes the site. Keep `CNAME` intact or the custom domain will break.
- Styling is plain CSS (system font stack, `clamp()`-based fluid type, yellow `#ffd93b` background, centered flex layout in `body`).
- The `frontend-design` plugin is enabled in `.claude/settings.local.json`.
