# Contributing

Thanks for helping improve **shatr**.

## Scope
This repo is the **framework** (a GitHub template). Each *poem* lives in its own
repo created from this template. So:
- **Framework PRs here** — engine, generator, validators, docs, accessibility,
  performance, new options.
- **Your poem** — use “Use this template”, don’t commit your poem to this repo
  (the bundled `content/` is only a public-domain demo).

## Ground rules
- Keep the engine **dependency-light** (currently just `esbuild`) and the output
  **0-reflow / accessible / Lighthouse-100**. Don’t regress those.
- `npm run build` must succeed and the demo must render. If you change `engine/`,
  verify in a browser (kashida justifies, dark mode, no console/CSP errors).
- Match the existing code style; keep diffs focused; explain the “why” in the PR.
- Don’t add tracking or third-party calls by default.

## Dev loop
```bash
npm install
npm run build
npm run preview   # http://localhost:8080
```

## Reporting
Open an issue with: what you expected, what happened, your `poem.config.json`
(minus secrets), and a screenshot if it’s visual. Security issues: please report
privately first.

By contributing you agree your contributions are licensed under the repo’s
[MIT License](LICENSE).
