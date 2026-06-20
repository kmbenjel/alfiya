
// Apply saved dark-mode preference before first paint (prevents theme flash).
// Zoom is intentionally NOT restored here — it is session-only by design.
(function () {
    try {
        const prefs = JSON.parse(localStorage.getItem('reader.prefs')) || {};
        const dark = prefs.darkMode === true ||
            (prefs.darkMode == null && window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.classList.add('dark-mode');
    } catch (e) {}
})();

// Print layout helper: ?print=mobile|desktop sets @page + a body class the print CSS targets.
(function () {
    const printLayout = new URLSearchParams(window.location.search).get('print');
    if (!printLayout) return;
    const style = document.createElement('style');
    style.textContent = printLayout === 'mobile'
        ? '@page { size: 120mm 210mm portrait; margin: 12mm 8mm 13mm 8mm }'
        : '@page { size: A4 portrait; margin: 16mm 15mm 18mm 15mm }';
    document.head.appendChild(style);
    const addClass = () => { document.body ? document.body.classList.add('print-' + printLayout) : setTimeout(addClass, 0); };
    addClass();
})();
