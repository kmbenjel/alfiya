<div dir="rtl">

# شطر · shatr

</div>

**Publish a complete, fast, accessible Arabic-poem website from just the text.**
You write the poem — one *shaṭr* (hemistich) per line, fully voweled — and `shatr`
generates a polished single-page site with automatic *kashida* (tatweel)
justification, dark mode, font zoom, a mobile dock, full SEO + structured data, a
PWA (installable, offline, custom splash), and a perfect-Lighthouse, accessible
build. It deploys itself to GitHub Pages on every push.

It is the engine behind [hmittou.benjelloun.dev](https://hmittou.benjelloun.dev),
generalized so any poem can have the same treatment.

---

## Quick start (humans)

1. Click **“Use this template” → Create a new repository** (one repo per poem).
2. Edit **two files**:
   - **`content/poem.txt`** — your poem, one shaṭr per line (see [AUTHORING.md](AUTHORING.md)).
   - **`content/poem.config.json`** — title, author, domain, description, links.
3. **Commit.** The included GitHub Action builds and deploys to GitHub Pages
   automatically. Enable it once: **Settings → Pages → Source: GitHub Actions**.
4. (Optional) Point a **custom domain** + **Cloudflare** at it — see [DEPLOY.md](DEPLOY.md).

You never need a terminal: edit the two files in GitHub’s web editor, commit, done.

### Or use the CLI
```bash
npm install
npx shatr init      # interactive: scaffold content/poem.config.json
npx shatr check     # validate poem + config (no build)
npx shatr build     # write dist/
npx shatr preview   # build + serve at http://localhost:8080
```
`shatr init` works interactively *and* from piped input (scriptable / AI-friendly).

### Or use the visual studio
```bash
npx shatr studio   # then open http://localhost:8080/studio/
```
Type the poem + fill the form, watch the **live kashida preview**, and download
`poem.txt` + `poem.config.json` to drop into your repo.

---

## What you get (out of the box)
- **Kashida justification** — each bayt’s two hemistichs are stretched to equal
  width using on-canvas measurement (zero layout reflows).
- **Dark mode** (persisted), **font zoom** (session-only, resets on reload/rotate),
  auto-hiding **mobile dock**, reading **progress bar**, smooth in-poem navigation.
- **SEO**: title/description/keywords, Open Graph + Twitter (single, correctly-sized
  image so WhatsApp/Facebook previews work), `CreativeWork`/`Poem` **JSON-LD**,
  `sitemap.xml`, `robots.txt`, canonical URL.
- **PWA**: web manifest, service worker (offline), installable, custom splash.
- **Performance & a11y**: self-hosted subset font with `font-display:swap` + preload,
  strict CSP, skip-link, ARIA labels, reduced-motion support, RTL, print stylesheet.
- **Smart validation**: the build fails on a dangling shaṭr (odd line count) and
  warns about lines that look under-voweled.

---

## For AI agents

To publish a poem with this template, you edit exactly two files, then commit.

1. **`content/poem.txt`** — UTF-8. One *shaṭr* per line. A *bayt* is two consecutive
   lines. Blank lines ignored. `# …` lines are comments. A line starting with `##`
   begins a new section whose text becomes a subtitle (e.g. `## التكملة`). Every
   section must contain an **even** number of shaṭr lines. Use full, correct tashkīl.
2. **`content/poem.config.json`** — conforms to [`schema/poem.config.schema.json`](schema/poem.config.schema.json).
   Required: `title`, `author`, `domain` (bare host, no `https://`), `description`
   (all Arabic). Common optional: `editor`, `keywords[]`, `about`,
   `dates.{created,published,signatureLine}`, `theme.{themeColor,splashColor}`,
   `resources.{soundcloud,whatsapp,pdf}`, `footer.{credit,name,facebook,dateLine}`,
   `analytics.ga4`, `social.card`.

Then: `npm install && npm run build` must succeed (it validates input and writes
`dist/`). Do not hand-edit anything under `engine/` or `dist/`. Commit `content/*`
(and `content/<card>.jpg` / `content/<file>.pdf` if referenced). The Action deploys.

---

## Repository layout
```
content/      ← you edit this (poem.txt + poem.config.json)
engine/       ← the framework (template, CSS, app.js, sw, icons) — leave alone
scripts/      ← build.mjs (generator) + validate.mjs
schema/       ← JSON Schema for poem.config.json
fonts/        ← subset Amiri (Arabic)
dist/         ← build output (generated; not committed)
```

## License
The framework **code** is [MIT](LICENSE). **Poem texts are not** — the contents of
`content/poem.txt` remain their author’s copyright. Only publish poems you have the
right to publish. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
