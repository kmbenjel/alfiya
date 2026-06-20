# Authoring a poem

You edit two files in `content/`. Nothing else.

## 1. `content/poem.txt` — the poem

- **One shaṭr (hemistich) per line.** A **bayt** is two consecutive lines.
- **Blank lines** are ignored (use them freely to group bayts visually).
- **`# comment`** lines (single hash) are ignored.
- **`## label`** starts a new **section**; `label` shows as a subtitle. The first
  section uses the poem title; later sections (e.g. a تكملة / تتمة) show their label.
- **Full tashkīl.** Vowel every consonant. The build *warns* about lines that look
  under-voweled, and *fails* if a section has an odd number of shaṭr lines (a bayt
  is missing its second hemistich).

```text
# الصدر (first hemistich)        # العجز (second hemistich) — on the next line
دَعِ الأَيَّامَ تَفْعَلُ مَا تَشَاءُ
وَطِبْ نَفْسًا إِذَا حَكَمَ الْقَضَاءُ

## التكملة
وَلَا حُزْنٌ يَدُومُ وَلَا سُرُورٌ
وَلَا بُؤْسٌ عَلَيْكَ وَلَا رَخَاءُ
```

## 2. `content/poem.config.json` — the metadata

Validated against [`schema/poem.config.schema.json`](schema/poem.config.schema.json)
(point your editor at it for autocomplete). Keys:

| key | required | notes |
|-----|----------|-------|
| `title` | ✓ | Arabic. H1, `<title>`, OG, JSON-LD name. |
| `author` | ✓ | Poet name. |
| `domain` | ✓ | **Bare host**, no `https://` (e.g. `poem.example.com`). Becomes `CNAME` + canonical URL. |
| `description` | ✓ | Meta + OG + JSON-LD description. |
| `editor` | | Vocaliser/editor name. |
| `lang` / `dir` | | Default `ar` / `rtl`. |
| `siteName` | | `og:site_name`. |
| `keywords` | | Array of strings → JSON-LD. |
| `about` | | One-line JSON-LD topic. |
| `dates.created` / `dates.published` | | `YYYY-MM-DD`. (`modified` is the build date, automatic.) |
| `dates.signatureLine` | | Free text under the first section’s signature. |
| `theme.themeColor` | | Browser toolbar (default `#f5f5f4`). |
| `theme.splashColor` | | PWA splash background (default `#121212`). Match your icon. |
| `resources.soundcloud` | | URL → a “listen” card + button. |
| `resources.whatsapp` | | `true` = auto share text, or a custom string. |
| `resources.pdf` | | A PDF filename placed in `content/` (copied to the site root). |
| `footer.{credit,name,facebook,dateLine}` | | Footer line + optional Facebook link. |
| `analytics.ga4` | | GA4 id (`G-…`). Omit for **zero** analytics. |
| `social.card` | | A `1200×630` JPG in `content/` for OG/Twitter. If omitted, the app icon is used. |
| `labels` | | Override any Arabic UI string (`سماع`, `إرسال`, `PDF`, `ويب`, …). |

## Replacing the icons / splash

The home-screen + splash icons live in `engine/icons/` (`icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, favicons, `apple-touch-icon.png`). Swap
them for your artwork (keep the same filenames and sizes). Maskable icons should
keep their important content within the central ~80% safe zone; the display icon
may have rounded/transparent corners for a nicer splash tile.

## Build it

```bash
npm install && npm run build   # fails on errors, prints warnings, writes dist/
npm run preview                # then open http://localhost:8080
```

## Long poems (alfiyyas) — `layout`

For short and medium poems keep the default **`"layout": "single"`** (one page; a
**Table of Contents** appears automatically when there are 2+ `##` sections).

For long, chapter-organized works (e.g. an alfiyya of ~1000 bayts), set
**`"layout": "paged"`**: each `##` chapter becomes its own fast page, the home page
becomes the **index/فهرس**, and every chapter gets **prev / index / next** navigation.
Each page keeps the full performance + SEO profile, and the sitemap lists them all.

```json
{ "layout": "paged" }
```
Organize the poem with one `## بابٌ …` heading per chapter in `content/poem.txt`.
