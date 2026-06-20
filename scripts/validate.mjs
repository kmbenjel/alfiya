// Poem + config validation. Pure (no IO) so build.mjs and tests can reuse it.

const HARAKAT = /[ً-ْٰـ]/;            // tanwin, harakat, sukun, shadda, dagger-alif, tatweel
const ARABIC_LETTER = /[ء-ي]/;                  // hamza..ya
const LONG_VOWEL = /[اأإآويءى]/; // alif-family, waw, ya, hamza — often unvoweled

// Parse poem.txt → sections of bayts (shatr pairs). Lines: blank ignored,
// "# .." comments ignored, "## label" starts a new section, else a shatr.
export function parsePoem(text) {
    const errors = [];
    const lines = text.split(/\r?\n/);
    const sections = [];
    let cur = null;
    const startSection = (label) => { cur = { label: label || null, shatrs: [] }; sections.push(cur); };

    lines.forEach((raw, i) => {
        const ln = i + 1;
        const line = raw.trim();
        if (line === '' || /^#(?!#)/.test(line)) return;          // blank or `# comment`
        if (line.startsWith('##')) { startSection(line.replace(/^##\s*/, '').trim()); return; }
        if (!cur) startSection(null);                              // implicit first section
        cur.shatrs.push({ text: line, line: ln });
    });

    if (sections.length === 0) errors.push('poem.txt has no verses.');

    // pair shatrs into bayts; odd count = a dangling shatr (error)
    const out = sections.map((s, idx) => {
        const bayts = [];
        for (let k = 0; k + 1 < s.shatrs.length; k += 2) bayts.push([s.shatrs[k], s.shatrs[k + 1]]);
        if (s.shatrs.length % 2 !== 0) {
            const last = s.shatrs[s.shatrs.length - 1];
            errors.push(`Section ${idx + 1} has an odd number of shatrs — dangling line ${last.line}: "${last.text}". Every bayt needs two shatrs.`);
        }
        return { label: s.label, bayts };
    });

    return { sections: out, errors };
}

// Heuristic "is it fully voweled?" check — warnings only (correctness is the author's).
// Flags lines whose Arabic consonants largely lack harakat.
export function checkTashkeel(sections, sourceLines) {
    const warnings = [];
    for (const s of sections) {
        for (const bayt of s.bayts) {
            for (const sh of bayt) {
                const letters = (sh.text.match(new RegExp(ARABIC_LETTER, 'g')) || [])
                    .filter(ch => !LONG_VOWEL.test(ch)).length;
                const marks = (sh.text.match(new RegExp(HARAKAT, 'g')) || []).length;
                if (letters >= 3 && marks < letters * 0.4) {
                    warnings.push(`Line ${sh.line} looks under-voweled (${marks} marks / ${letters} consonants): "${sh.text}"`);
                }
            }
        }
    }
    return warnings;
}

const REQUIRED = ['title', 'author', 'domain', 'description'];

export function validateConfig(cfg) {
    const errors = [];
    for (const k of REQUIRED) if (!cfg[k] || String(cfg[k]).trim() === '') errors.push(`config: "${k}" is required.`);
    if (cfg.domain && /^https?:\/\//.test(cfg.domain)) errors.push('config.domain must be a bare host (e.g. "poem.example.com"), not a URL.');
    if (cfg.keywords && !Array.isArray(cfg.keywords)) errors.push('config.keywords must be an array of strings.');
    const isoish = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of ['created', 'published']) {
        const v = cfg.dates && cfg.dates[d];
        if (v && !isoish.test(v)) errors.push(`config.dates.${d} must be YYYY-MM-DD.`);
    }
    return errors;
}
