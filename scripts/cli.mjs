#!/usr/bin/env node
// shatr CLI — scaffold, validate, build, preview.
//   shatr init     interactive wizard → content/poem.config.json (+ poem.txt scaffold)
//   shatr check    validate poem.txt + poem.config.json (no build)
//   shatr build    build dist/
//   shatr preview  build + serve at http://localhost:8080
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePoem, checkTashkeel, validateConfig } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(ROOT, ...p);
const C = { g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` };

const POEM_SCAFFOLD = `# content/poem.txt — one SHATR (hemistich) per line. A bayt = two consecutive
# lines. Blank lines ignored. "# .." = comment. "## label" starts a new section.
# Use full, correct tashkeel.

`;

async function init() {
    const isTTY = process.stdin.isTTY;
    const piped = isTTY ? [] : readFileSync(0, 'utf8').split(/\r?\n/);
    const rl = isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
    const ask = async (q, def) => {
        let a = '';
        if (isTTY) { try { a = (await rl.question(`${q}${def ? C.dim(` [${def}]`) : ''}: `)).trim(); } catch { a = ''; } }
        else { a = (piped.length ? piped.shift() : '').trim(); }
        return a || def || '';
    };
    console.log(C.g('\n  shatr · new poem\n') + C.dim('  Press Enter to accept a default or skip an optional field.\n'));
    const cfg = {};
    cfg.title = await ask('Title (Arabic)');
    cfg.author = await ask('Author');
    cfg.domain = await ask('Domain (bare host, e.g. poem.example.com)');
    cfg.description = await ask('Description (Arabic)');
    const editor = await ask('Editor / vocaliser (optional)'); if (editor) cfg.editor = editor;
    cfg.lang = await ask('Language tag', 'ar');
    const layout = await ask('Layout: single | paged', 'single'); if (layout === 'paged') cfg.layout = 'paged';
    const kw = await ask('Keywords (comma-separated, optional)'); if (kw) cfg.keywords = kw.split(',').map(s => s.trim()).filter(Boolean);
    const splash = await ask('PWA splash color', '#121212');
    cfg.theme = { themeColor: '#f5f5f4', splashColor: splash };
    cfg.resources = {};
    if ((await ask('Add a WhatsApp share button? y/n', 'y')).toLowerCase().startsWith('y')) cfg.resources.whatsapp = true;
    const sc = await ask('SoundCloud URL (optional)'); if (sc) cfg.resources.soundcloud = sc;
    const pdf = await ask('PDF filename in content/ (optional)'); if (pdf) cfg.resources.pdf = pdf;
    const credit = await ask('Footer credit (e.g. قرأه وضبطه)'); const fname = await ask('Footer name', cfg.author);
    const fb = await ask('Facebook URL (optional)');
    cfg.footer = { credit, name: fname, ...(fb ? { facebook: fb } : {}) };
    const ga = await ask('GA4 id (optional, omit for zero analytics)'); if (ga) cfg.analytics = { ga4: ga };
    if (rl) rl.close();

    const errs = validateConfig(cfg);
    if (errs.length) { console.log(C.r('\n  Missing required fields:\n   - ' + errs.join('\n   - ') + '\n')); process.exit(1); }
    const out = { $schema: '../schema/poem.config.schema.json', ...cfg };
    writeFileSync(r('content/poem.config.json'), JSON.stringify(out, null, 2) + '\n');
    if (!existsSync(r('content/poem.txt'))) writeFileSync(r('content/poem.txt'), POEM_SCAFFOLD);
    console.log(C.g('\n  ✓ wrote content/poem.config.json') + (existsSync(r('content/poem.txt')) ? '' : ' + content/poem.txt'));
    console.log('  Next: put your poem in ' + C.y('content/poem.txt') + ', then ' + C.y('npm run build') + ' (or ' + C.y('shatr check') + ').\n');
}

function check() {
    let ok = true;
    try {
        const cfg = JSON.parse(readFileSync(r('content/poem.config.json'), 'utf8'));
        const ce = validateConfig(cfg);
        ce.forEach(e => { ok = false; console.log(C.r('  ✗ ' + e)); });
        const { sections, errors } = parsePoem(readFileSync(r('content/poem.txt'), 'utf8'));
        errors.forEach(e => { ok = false; console.log(C.r('  ✗ ' + e)); });
        const warns = checkTashkeel(sections);
        warns.slice(0, 20).forEach(w => console.log(C.y('  ⚠ ' + w)));
        if (warns.length > 20) console.log(C.y('  ⚠ …and ' + (warns.length - 20) + ' more.'));
        const bayts = sections.reduce((n, s) => n + s.bayts.length, 0);
        if (ok) console.log(C.g(`  ✓ valid — ${sections.length} section(s), ${bayts} bayt(s)` + (warns.length ? `, ${warns.length} tashkeel warning(s)` : '')));
    } catch (e) { ok = false; console.log(C.r('  ✗ ' + e.message)); }
    process.exit(ok ? 0 : 1);
}

const buildNow = () => import('./build.mjs');

async function main() {
    const cmd = process.argv[2] || 'help';
    if (cmd === 'init') return init();
    if (cmd === 'check') return check();
    if (cmd === 'build') return buildNow();
    if (cmd === 'preview') { await buildNow(); spawn('python3', ['-m', 'http.server', '8080'], { cwd: r('dist'), stdio: 'inherit' }); return; }
    if (cmd === 'studio') { console.log(C.g('  studio → http://localhost:8080/studio/')); spawn('python3', ['-m', 'http.server', '8080'], { cwd: ROOT, stdio: 'inherit' }); return; }
    console.log(`shatr — Arabic-poem site generator

  shatr init      scaffold content/poem.config.json (interactive)
  shatr check     validate the poem + config (no build)
  shatr build     build the site into dist/
  shatr preview   build + serve at http://localhost:8080
  shatr studio    open the in-browser authoring studio (live preview)

Docs: README.md · AUTHORING.md · DEPLOY.md`);
}
main();
