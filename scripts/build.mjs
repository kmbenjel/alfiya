#!/usr/bin/env node
// shatr — build a static Arabic-poem site from content/ + engine/ into dist/.
// Layouts: "single" (one page, optional ToC) and "paged" (index + a page per chapter).
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import esbuild from 'esbuild';
import { parsePoem, checkTashkeel, validateConfig } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(ROOT, ...p);
const read = (p) => readFileSync(r(p), 'utf8');
const die = (m) => { console.error('\x1b[31m✗ ' + m + '\x1b[0m'); process.exit(1); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);

// ── Load + validate ─────────────────────────────────────────────────────────
let cfg;
try { cfg = JSON.parse(read('content/poem.config.json')); }
catch (e) { die('content/poem.config.json missing or invalid JSON: ' + e.message); }
const cfgErrors = validateConfig(cfg);
if (cfgErrors.length) die('Config errors:\n  - ' + cfgErrors.join('\n  - '));
const { sections, errors } = parsePoem(read('content/poem.txt'));
if (errors.length) die('Poem errors:\n  - ' + errors.join('\n  - '));
const warnings = checkTashkeel(sections);
if (warnings.length) {
    console.warn('\x1b[33m⚠ tashkeel — ' + warnings.length + ' line(s) may be under-voweled:\x1b[0m');
    warnings.slice(0, 12).forEach(w => console.warn('  ' + w));
    if (warnings.length > 12) console.warn('  …and ' + (warnings.length - 12) + ' more.');
}

// ── Derived ───────────────────────────────────────────────────────────────────
const LANG = cfg.lang || 'ar', DIR = cfg.dir || 'rtl';
const URL = 'https://' + cfg.domain + '/';
const today = new Date().toISOString().slice(0, 10);
const siteSlug = (cfg.domain.split('.')[0] || 'poem').replace(/[^a-z0-9-]/gi, '');
const layout = cfg.layout === 'paged' ? 'paged' : 'single';
const multi = sections.length > 1;
const UI = Object.assign({
    skip: 'تخطي إلى المحتوى', readerSettings: 'إعدادات القراءة', nav: 'التنقل في القصيدة', links: 'روابط القصيدة',
    dock: 'شريط التنقل', theme: 'تبديل المظهر', zoomIn: 'تكبير الخط', zoomOut: 'تصغير الخط', top: 'إلى الأعلى',
    bottom: 'إلى الأسفل', listen: 'سماع', send: 'إرسال', pdf: 'PDF', web: 'ويب', pdfTitle: 'تحميل PDF',
    soundTitle: 'سماع القصيدة', sendTitle: 'إرسال في واتساب', toc: 'الفهرس', prev: 'السابق', next: 'التالي', index: 'الفهرس',
}, cfg.labels || {});
const R = cfg.resources || {};

// ── esbuild minify + hash ───────────────────────────────────────────────────────
const minify = async (f) => { const { code } = await esbuild.transform(read('engine/' + f), { minify: true, target: 'es2019', legalComments: 'none' }); return { code, hash: sha(code) }; };
const app = await minify('app.js');
const analytics = cfg.analytics && cfg.analytics.ga4;
let gtm = null;
if (analytics) { gtm = await minify('gtm-loader.js'); gtm.code = gtm.code.replace(/\{\{GA4_ID\}\}/g, cfg.analytics.ga4); gtm.hash = sha(gtm.code); }

// ── Buttons (rails + dock) ───────────────────────────────────────────────────────
const ACT = {
    'toggle-theme': ['i-theme', '0 0 512 512', UI.theme, true], 'zoom-in': ['i-plus', '0 0 448 512', UI.zoomIn],
    'zoom-out': ['i-minus', '0 0 448 512', UI.zoomOut], 'scroll-top': ['i-chevron-up', '0 0 448 512', UI.top],
    'scroll-bottom': ['i-chevron-down', '0 0 448 512', UI.bottom], 'scroll-sound': ['i-soundcloud', '0 0 640 512', UI.soundTitle],
    'scroll-whatsapp': ['i-whatsapp', '0 0 448 512', UI.sendTitle], 'scroll-pdf': ['i-pdf', '0 0 384 512', UI.pdfTitle],
};
const btn = (kind, a) => { const [icon, vb, title, pressed] = ACT[a]; const cls = kind === 'dock' ? 'dock-btn' : 'control-btn';
    return `<button type="button" class="${cls}" data-action="${a}" title="${esc(title)}" aria-label="${esc(title)}"${pressed ? ' aria-pressed="false"' : ''}><svg class="icon-svg" aria-hidden="true" viewBox="${vb}"><use href="#${icon}"/></svg></button>`; };
const rail = (kind, acts) => acts.map(a => btn(kind, a)).join('');
const dockGroup = (name, acts) => acts.length ? `<div class="dock-group ${name}">${rail('dock', acts)}</div>` : '';
const settingsActions = ['toggle-theme', 'zoom-in', 'zoom-out'];
const navActions = ['scroll-top', 'scroll-bottom'];
const resActions = [R.soundcloud && 'scroll-sound', R.whatsapp && 'scroll-whatsapp', R.pdf && 'scroll-pdf'].filter(Boolean);

// ── Poem + ToC builders ──────────────────────────────────────────────────────────
const chapterSlug = (i) => 'chapter-' + (i + 1);
const tocLabel = (i) => sections[i].label || (i === 0 ? cfg.title : (cfg.title + ' — ' + (i + 1)));
const baytHtml = (b) => `            <div class="bayt">\n                <div class="verse">${esc(b[0].text)}</div>\n                <div class="verse">${esc(b[1].text)}</div>\n            </div>`;
const sigHtml = (s, idx) => {
    const dl = (idx === 0 && cfg.dates && cfg.dates.signatureLine) ? `\n                <span class="poet-date">${esc(cfg.dates.signatureLine)}</span>` : '';
    return `            <div class="signature">\n                <span class="poet-name">${esc(cfg.author)}</span>${dl}\n            </div>`;
};
const sectionHtml = (s, idx, { withSig = true, asChapter = false } = {}) => {
    const head = (idx === 0 && !asChapter)
        ? `            <h1 class="title">${esc(cfg.title)}</h1>`
        : `            <h2 class="title">${esc(asChapter ? (s.label || cfg.title) : cfg.title)}${s.label && !(idx === 0) ? `<span class="subtitle">${esc(s.label)}</span>` : (asChapter ? `<span class="subtitle">${esc(cfg.title)}</span>` : '')}</h2>`;
    return `        <div class="poem-section" id="sec-${idx + 1}">\n${head}\n${s.bayts.map(baytHtml).join('\n\n')}${withSig ? '\n\n' + sigHtml(s, idx) : ''}\n        </div>`;
};
const tocHtml = (linkFn) => `        <nav class="toc" aria-label="${esc(UI.toc)}">\n            <h2>${esc(UI.toc)}</h2>\n            <ol>\n${sections.map((s, i) => `                <li><a href="${linkFn(i)}">${esc(tocLabel(i))}</a></li>`).join('\n')}\n            </ol>\n        </nav>`;
const chapterNav = (idx) => {
    const a = (i, label) => `<a href="/${chapterSlug(i)}/">${esc(label)}</a>`;
    const prev = idx > 0 ? a(idx - 1, UI.prev) : '<span class="nv-disabled"></span>';
    const next = idx < sections.length - 1 ? a(idx + 1, UI.next) : '<span class="nv-disabled"></span>';
    return `        <nav class="chapter-nav">${prev}<a href="/">${esc(UI.index)}</a>${next}</nav>`;
};

// ── Resource cards ─────────────────────────────────────────────────────────────
const card = (href, dl, id, ic, icon, vb, label) =>
    `                <a href="${href}"${dl ? ` download="${dl}"` : ' target="_blank" rel="noopener noreferrer"'} class="resource-card" id="${id}">\n                    <div class="resource-content-wrapper">\n                        <div class="resource-icon ${ic}"><svg class="icon-svg" aria-hidden="true" viewBox="${vb}"><use href="#${icon}"/></svg></div>\n                        <div class="resource-info"><div class="resource-label">${esc(label)}</div></div>\n                    </div>\n                </a>`;
const waText = (R.whatsapp === true || R.whatsapp === undefined) ? `*${cfg.title}*\n${cfg.author}\n🔗 ${URL}` : String(R.whatsapp);
const resourceCards = () => {
    const c = [];
    if (R.soundcloud) c.push(card(esc(R.soundcloud), '', 'soundcloud-card', 'soundcloud-icon', 'i-soundcloud', '0 0 640 512', UI.listen));
    if (R.whatsapp) c.push(card('https://api.whatsapp.com/send?text=' + encodeURIComponent(waText), '', 'whatsapp-card', 'whatsapp-icon', 'i-whatsapp', '0 0 448 512', UI.send));
    if (R.pdf) c.push(card('/' + esc(R.pdf), esc(R.pdf), 'pdf-card', 'pdf-icon', 'i-pdf', '0 0 384 512', UI.pdf));
    c.push(card(esc(URL), '', 'web-card', 'web-icon', 'i-web', '0 0 512 512', UI.web));
    return `        <section class="resource-section" id="bottom" aria-label="${esc(UI.links)}">\n            <div class="resource-grid">\n${c.join('\n')}\n            </div>\n        </section>`;
};

// ── Footer ──────────────────────────────────────────────────────────────────────
const F = cfg.footer || {};
const fb = F.facebook ? ` <a href="${esc(F.facebook)}" target="_blank" rel="noopener noreferrer">${esc(F.name || cfg.author)} <svg class="icon-svg footer-fb-icon" aria-hidden="true" viewBox="0 0 512 512"><use href="#i-facebook"/></svg></a>` : ` ${esc(F.name || cfg.author)}`;
const FOOTER = [`        <p>${esc(F.credit || '')}${fb}</p>`, F.dateLine ? `        <p>${esc(F.dateLine)}</p>` : '',
    `        <p id="last-updated" data-fallback-date="${today}" style="font-size:0.8em;opacity:0.8;margin-top:6px">آخر تحديث: ${today}</p>`].filter(Boolean).join('\n');

// ── Head meta + JSON-LD (per page) ────────────────────────────────────────────────
const social = cfg.social && cfg.social.card;
const ogImg = social ? URL + 'assets/social-card.jpg' : URL + 'assets/icons/icon-512.png';
const ogW = social ? 1200 : 512, ogH = social ? 630 : 512;
const firstBayt = sections[0].bayts[0] ? sections[0].bayts[0].map(s => s.text).join('\n') : '';
const m = (p, c, prop) => `    <meta ${prop ? 'property' : 'name'}="${p}" content="${esc(c)}">`;
const headMeta = (title, canonical) => [
    m('description', cfg.description), `    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    m('author', cfg.author), m('theme-color', (cfg.theme && cfg.theme.themeColor) || '#f5f5f4'),
    `    <meta name="color-scheme" content="light dark">`, `    <meta name="apple-mobile-web-app-capable" content="yes">`,
    `    <meta name="mobile-web-app-capable" content="yes">`, `    <meta name="apple-mobile-web-app-status-bar-style" content="default">`,
    cfg.dates && cfg.dates.published ? m('date', cfg.dates.published) : '', m('last-modified', today),
    `    <link rel="icon" href="/assets/icons/favicon.ico" sizes="any">`, `    <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32x32.png">`,
    `    <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">`, `    <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">`,
    `    <link rel="manifest" href="/site.webmanifest">`, `    <link rel="canonical" href="${canonical}">`,
    R.pdf ? `    <link rel="alternate" type="application/pdf" href="${URL}${esc(R.pdf)}">` : '',
    `    <meta property="og:type" content="website">`, m('og:locale', LANG.includes('-') ? LANG.replace('-', '_') : LANG, true),
    cfg.siteName ? m('og:site_name', cfg.siteName, true) : '', m('og:title', title, true), m('og:description', cfg.description, true),
    m('og:url', canonical, true), `    <meta property="og:image" content="${ogImg}">`, `    <meta property="og:image:width" content="${ogW}">`,
    `    <meta property="og:image:height" content="${ogH}">`, m('twitter:title', title), m('twitter:description', cfg.description),
    m('twitter:image', ogImg), `    <meta name="twitter:card" content="summary_large_image">`, `    <title>${esc(title)}</title>`,
].filter(Boolean).join('\n');
const jsonLd = (title, canonical) => {
    const o = { '@context': 'https://schema.org', '@type': ['CreativeWork', 'Poem'], name: cfg.title, headline: title,
        description: cfg.description, inLanguage: LANG, author: { '@type': 'Person', name: cfg.author },
        ...(cfg.editor ? { editor: { '@type': 'Person', name: cfg.editor } } : {}), dateCreated: cfg.dates && cfg.dates.created,
        datePublished: cfg.dates && cfg.dates.published, dateModified: today, text: firstBayt, url: canonical,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }, isAccessibleForFree: true,
        ...(cfg.keywords ? { keywords: cfg.keywords } : {}), ...(cfg.about ? { about: cfg.about } : {}),
        image: [{ '@type': 'ImageObject', url: ogImg, contentUrl: ogImg, width: ogW, height: ogH, caption: cfg.title }] };
    return '    <script type="application/ld+json">\n' + JSON.stringify(o, null, 2).replace(/^/gm, '    ') + '\n    </script>';
};

// ── CSP ───────────────────────────────────────────────────────────────────────────
const PREPAINT = read('engine/prepaint.js').trim();
const inlineHash = createHash('sha256').update(PREPAINT).digest('base64');
const CSP = [`default-src 'self'`, `script-src 'self' 'sha256-${inlineHash}'${analytics ? ' https://www.googletagmanager.com https://www.google-analytics.com' : ''} https://static.cloudflareinsights.com`,
    `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:${analytics ? ' https://www.google-analytics.com https://www.googletagmanager.com' : ''}`,
    `font-src 'self'`, `connect-src 'self'${analytics ? ' https://www.google-analytics.com https://www.googletagmanager.com' : ''} https://cloudflareinsights.com`,
    `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`].join('; ');

// ── Page assembler ─────────────────────────────────────────────────────────────────
const TEMPLATE = read('engine/template.html'), STYLES = read('engine/styles.css').trim();
const ANALYTICS_HEAD = analytics ? `    <script src="/assets/js/gtm-loader.min.js?v=${gtm.hash}" defer></script>\n` : '';
const assemble = ({ title, canonical, main, withRes }) => TEMPLATE
    .replace('{{DIR}}', DIR).replace('{{LANG}}', LANG).replace('{{CSP}}', CSP).replace('{{PREPAINT}}', PREPAINT)
    .replace('{{ANALYTICS_HEAD}}', ANALYTICS_HEAD).replace('{{HEAD_META}}', headMeta(title, canonical) + '\n' + jsonLd(title, canonical))
    .replace('{{STYLES}}', STYLES).replace('{{SKIP_LABEL}}', esc(UI.skip))
    .replace('{{ARIA_READER_SETTINGS}}', esc(UI.readerSettings)).replace('{{ARIA_NAV}}', esc(UI.nav))
    .replace('{{ARIA_LINKS}}', esc(UI.links)).replace('{{ARIA_DOCK}}', esc(UI.dock))
    .replace('{{CONTROLS}}', rail('control', settingsActions)).replace('{{NAV_CONTROLS}}', rail('control', navActions))
    .replace('{{LEFT_CONTROLS}}', withRes ? rail('control', resActions) : '')
    .replace('{{MAIN}}', main).replace('{{FOOTER}}', FOOTER).replace('{{APP_SCRIPT}}', `/assets/js/app.min.js?v=${app.hash}`)
    .replace('{{BOTTOM_DOCK}}', dockGroup('settings-group', settingsActions) + dockGroup('nav-group', navActions) + (withRes ? dockGroup('resources-group', resActions) : ''));

// ── Write dist/ ───────────────────────────────────────────────────────────────────
const DIST = r('dist');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, 'assets/js'), { recursive: true });
mkdirSync(path.join(DIST, 'assets/icons'), { recursive: true });
mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
const w = (p, c) => { const fp = path.join(DIST, p); mkdirSync(path.dirname(fp), { recursive: true }); writeFileSync(fp, c); };

w('assets/js/app.min.js', app.code);
if (gtm) w('assets/js/gtm-loader.min.js', gtm.code);
w('CNAME', cfg.domain + '\n');
w('robots.txt', read('engine/robots.txt').replace(/\{\{URL\}\}/g, URL));
w('site.webmanifest', read('engine/manifest.template.json').replace(/\{\{TITLE\}\}/g, cfg.title).replace('{{SHORT_NAME}}', cfg.shortName || cfg.title)
    .replace('{{MANIFEST_DESC}}', cfg.manifestDescription || cfg.description).replace('{{LANG}}', LANG).replace('{{DIR}}', DIR)
    .replace('{{SPLASH_COLOR}}', (cfg.theme && cfg.theme.splashColor) || '#121212').replace('{{THEME_COLOR}}', (cfg.theme && cfg.theme.themeColor) || '#f5f5f4'));
const swAssets = ['./', './index.html', './site.webmanifest', './fonts/amiri-regular-arabic.woff2', './assets/icons/apple-touch-icon.png',
    './assets/icons/favicon-16x16.png', './assets/icons/favicon-32x32.png', './assets/icons/favicon.ico', './assets/icons/favicon.svg',
    './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png',
    ...(gtm ? [`./assets/js/gtm-loader.min.js?v=${gtm.hash}`] : []), `./assets/js/app.min.js?v=${app.hash}`];
w('sw.js', read('engine/sw.js').replace('{{CACHE_NAME}}', `${siteSlug}-cache-${app.hash}`).replace('{{ASSETS}}', JSON.stringify(swAssets, null, 2)));
copyFileSync(r('fonts/amiri-regular-arabic.woff2'), path.join(DIST, 'fonts/amiri-regular-arabic.woff2'));
for (const f of readdirSync(r('engine/icons'))) copyFileSync(r('engine/icons', f), path.join(DIST, 'assets/icons', f));
if (social && existsSync(r('content', social))) copyFileSync(r('content', social), path.join(DIST, 'assets/social-card.jpg'));
if (R.pdf && existsSync(r('content', R.pdf))) copyFileSync(r('content', R.pdf), path.join(DIST, R.pdf));

let urls = [URL];
if (layout === 'paged') {
    const indexMain = (sections.length ? tocHtml((i) => '/' + chapterSlug(i) + '/') + '\n' : '') + resourceCards();
    w('index.html', assemble({ title: cfg.title, canonical: URL, main: indexMain, withRes: true }));
    sections.forEach((s, i) => {
        const canonical = URL + chapterSlug(i) + '/';
        const main = chapterNav(i) + '\n' + sectionHtml(s, i, { withSig: i === 0, asChapter: true }) + '\n' + chapterNav(i);
        w(chapterSlug(i) + '/index.html', assemble({ title: tocLabel(i) === cfg.title ? cfg.title : tocLabel(i) + ' — ' + cfg.title, canonical, main, withRes: false }));
        urls.push(canonical);
    });
} else {
    const main = (multi ? tocHtml((i) => '#sec-' + (i + 1)) + '\n' : '') + sections.map((s, i) => sectionHtml(s, i)).join('\n\n') + '\n' + resourceCards();
    w('index.html', assemble({ title: cfg.title, canonical: URL, main, withRes: true }));
}
w('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${u === URL ? '1.0' : '0.8'}</priority></url>`).join('\n') + `\n</urlset>\n`);

const bayts = sections.reduce((n, s) => n + s.bayts.length, 0);
console.log(`\x1b[32m✓ built dist/ (${layout}) — ${sections.length} section(s), ${bayts} bayt(s), ${urls.length} page(s), app.min.js?v=${app.hash}\x1b[0m`);
