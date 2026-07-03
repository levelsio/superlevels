// ═══════════════════════════════════
//  superlevels: X Dim Mode
//  Based on https://github.com/juanbuis/x-dim-mode
// ═══════════════════════════════════
(() => {
const DIM_BASE_ID = "x-dim-base-ext";
const DIM_CLASS = "x-dim-active";

// ── Theme Definitions ──────────────────────────────────────────────

const THEMES = {
  dim:   { hue: 210, sat: 34 },
  slate: { hue: 210, sat: 8  },
  jade:  { hue: 150, sat: 34 },
  plum:  { hue: 270, sat: 34 },
  dusk:  { hue: 330, sat: 34 },
  ember: { hue: 25,  sat: 34 },
};

let _theme = "dim";
let _customHue = 210;

function paletteFromHue(h, s) {
  const bSat = Math.round(s * 0.47);
  return {
    bg:         `hsl(${h}, ${s}%, 13%)`,
    bgHover:    `hsl(${h}, ${Math.round(s * 0.74)}%, 16%)`,
    bgElevated: `hsl(${h}, ${Math.round(s * 0.71)}%, 20%)`,
    backdrop:   `hsla(${h}, ${s}%, 13%, 0.85)`,
    text:       `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`,
    border:     `hsl(${h}, ${bSat}%, 26%)`,
    bgRaw:      `${h} ${s}% 13%`,
    borderRaw:  `${h} ${bSat}% 26%`,
    mutedRaw:   `${h} ${bSat}% 55%`,
    grayRaw60:  `${h} ${bSat}% 60%`,
    grayRaw50:  `${h} ${bSat}% 50%`,
  };
}

function getActiveHueSat() {
  if (_theme === "custom") return { hue: _customHue, sat: 34 };
  return THEMES[_theme] || THEMES.dim;
}

// ── Theme CSS ──────────────────────────────────────────────────────

function buildThemeCSS() {
  const { hue: h, sat: s } = getActiveHueSat();
  const p = paletteFromHue(h, s);
  return `
  html.${DIM_CLASS} {
    --xdm-bg: ${p.bg};
    --xdm-bg-hover: ${p.bgHover};
    --xdm-bg-elevated: ${p.bgElevated};
    --xdm-backdrop: ${p.backdrop};
    --xdm-text: ${p.text};
    --xdm-border: ${p.border};
  }
  html.${DIM_CLASS} body.LightsOut {
    --color: var(--xdm-text);
    --border: ${p.borderRaw};
    --input: ${p.borderRaw};
    --border-color: var(--xdm-border);
  }
  html.${DIM_CLASS}[data-theme="dark"],
  html.${DIM_CLASS} [data-theme="dark"] {
    --background: ${p.bgRaw};
    --border: ${p.borderRaw};
    --input: ${p.borderRaw};
    --muted-foreground: ${p.mutedRaw};
    --color-background: ${p.bgRaw};
    --color-gray-0: ${p.bgRaw};
    --color-gray-50: ${p.borderRaw};
    --color-gray-100: ${p.borderRaw};
    --color-gray-700: ${p.grayRaw60};
    --color-gray-800: ${p.grayRaw50};
  }`;
}

const STATIC_CSS = `
  html.${DIM_CLASS},
  html.${DIM_CLASS} body {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} [style*="background-color: rgb(0, 0, 0)"],
  html.${DIM_CLASS} [style*="background-color: rgba(0, 0, 0, 1)"] {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} [style*="background-color: rgb(24, 24, 27)"],
  html.${DIM_CLASS} [style*="background-color: rgb(22, 24, 28)"],
  html.${DIM_CLASS} [style*="background-color: rgb(15, 20, 25)"] {
    background-color: var(--xdm-bg-hover) !important;
  }
  /* Modal dialogs (post composer, etc.) — class-based dark bg */
  html.${DIM_CLASS} [role="dialog"][aria-modal="true"] {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} [role="link"] > div > div:first-child div:has(> svg:only-child) {
    background-color: var(--xdm-bg-elevated) !important;
  }
  html.${DIM_CLASS} .r-kemksi,
  html.${DIM_CLASS} .r-1niwhzg,
  html.${DIM_CLASS} .r-yfoy6g,
  html.${DIM_CLASS} .r-14lw9ot {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} form[role="search"] input {
    background-color: transparent !important;
  }
  html.${DIM_CLASS} .r-1niwhzg.r-sdzlij {
    background-color: transparent !important;
  }
  html.${DIM_CLASS} .r-5zmot {
    background-color: var(--xdm-backdrop) !important;
  }
  html.${DIM_CLASS} .r-1shrkeu {
    background-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} .r-1hdo0pc {
    background-color: var(--xdm-bg-hover) !important;
  }
  html.${DIM_CLASS} .r-g2wdr4 {
    background-color: var(--xdm-bg-hover) !important;
  }
  html.${DIM_CLASS} .r-g2wdr4 [role="link"]:hover {
    background-color: var(--xdm-bg-elevated) !important;
  }
  html.${DIM_CLASS} .r-1kqtdi0,
  html.${DIM_CLASS} .r-1roi411 {
    border-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} .r-2sztyj {
    border-top-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} .r-1igl3o0,
  html.${DIM_CLASS} .r-rull8r {
    border-bottom-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} .r-gu4em3,
  html.${DIM_CLASS} .r-1bnu78o {
    background-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} .r-1bwzh9t {
    color: var(--xdm-text) !important;
  }
  html.${DIM_CLASS} .draftjs-styles_0 .public-DraftEditorPlaceholder-root,
  html.${DIM_CLASS} .public-DraftEditorPlaceholder-inner {
    color: var(--xdm-text) !important;
  }
  html.${DIM_CLASS} [style*="color: rgb(113, 118, 123)"],
  html.${DIM_CLASS} [style*="-webkit-line-clamp: 3; color: rgb(113, 118, 123)"],
  html.${DIM_CLASS} [style*="-webkit-line-clamp: 2; color: rgb(113, 118, 123)"] {
    color: var(--xdm-text) !important;
  }
  html.${DIM_CLASS} ::placeholder {
    color: var(--xdm-text) !important;
  }
  html.${DIM_CLASS} .bg-gray-0 {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} .border-gray-50,
  html.${DIM_CLASS} .border-gray-100 {
    border-color: var(--xdm-border) !important;
  }
  html.${DIM_CLASS} [style*="border-color: rgb(47, 51, 54)"].r-1che71a {
    background-color: var(--xdm-bg-hover) !important;
  }
  html.${DIM_CLASS} .xdm-dimmed {
    background-color: var(--xdm-bg) !important;
  }
  html.${DIM_CLASS} .xdm-dimmed-elevated {
    background-color: var(--xdm-bg-hover) !important;
  }
  html.${DIM_CLASS} .jf-element:has(> span:only-child > svg:only-child) {
    background-color: var(--xdm-bg-elevated) !important;
  }
  html.${DIM_CLASS} .xdm-dimmed-elevated .jf-element:empty {
    background-color: var(--xdm-border) !important;
    border-color: var(--xdm-border) !important;
  }
`;

function buildFullCSS() { return buildThemeCSS() + STATIC_CSS; }

function ensureBaseCSS() {
  const css = buildFullCSS();
  let style = document.getElementById(DIM_BASE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = DIM_BASE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

// Inject CSS immediately (gated by html.x-dim-active so inert until class added)
ensureBaseCSS();

// Optimistic early apply
if (localStorage.getItem("__xdm_enabled") !== "0" &&
    (!window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.classList.add(DIM_CLASS);
}

// ── PWA theme-color sync ──────────────────────────────────────────

let _originalThemeColor = null;
let _themeColorObserver = null;

function syncThemeColor() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    if (!document.head) return;
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (_originalThemeColor === null) _originalThemeColor = meta.getAttribute("content");
  const { hue, sat } = getActiveHueSat();
  const desired = `hsl(${hue}, ${sat}%, 13%)`;
  if (meta.getAttribute("content") !== desired) meta.setAttribute("content", desired);
}

function startThemeColorObserver() {
  if (_themeColorObserver || !document.head) return;
  _themeColorObserver = new MutationObserver(() => {
    if (_enabled && document.documentElement.classList.contains(DIM_CLASS)) syncThemeColor();
  });
  _themeColorObserver.observe(document.head, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["content"],
  });
}

function stopThemeColorObserver() {
  if (_themeColorObserver) { _themeColorObserver.disconnect(); _themeColorObserver = null; }
}

function restoreThemeColor() {
  if (_originalThemeColor === null) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", _originalThemeColor);
  _originalThemeColor = null;
}

// ── Apply / Remove ────────────────────────────────────────────────

function applyDim() {
  ensureBaseCSS();
  document.documentElement.classList.add(DIM_CLASS);
  syncThemeColor();
  startThemeColorObserver();
  if (document.body) queueScan([document.body]);
}

function removeDim() {
  document.documentElement.classList.remove(DIM_CLASS);
  stopThemeColorObserver();
  restoreThemeColor();
  if (_scanFrame) { cancelAnimationFrame(_scanFrame); _scanFrame = 0; _pending.clear(); }
  for (const el of document.querySelectorAll(".xdm-dimmed, .xdm-dimmed-elevated")) {
    el.classList.remove("xdm-dimmed", "xdm-dimmed-elevated");
  }
}

// ── System Theme Sync ─────────────────────────────────────────────

let _bodyObserver;
let _suspendedForLight = false;
let _seenLightsOut = false;

function syncDimWithTheme() {
  if (!_enabled || !document.body) return;
  const hasLightsOut = document.body.classList.contains("LightsOut");
  const dimActive = document.documentElement.classList.contains(DIM_CLASS);
  if (hasLightsOut) {
    _suspendedForLight = false;
    applyDim();
    if (!dimActive) {
      for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
    }
  } else if (dimActive && _seenLightsOut) {
    _suspendedForLight = true;
    removeDim();
  }
}

function startBodyObserver() {
  if (_bodyObserver || !document.body) return;
  if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
  _bodyObserver = new MutationObserver(() => {
    if (document.body.classList.contains("LightsOut")) _seenLightsOut = true;
    syncDimWithTheme();
  });
  _bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

function stopBodyObserver() {
  if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
}

// ── Black Background Scanner ─────────────────────────────────────

let _scanFrame = 0;
const _pending = new Set();

function queueScan(nodes) {
  for (const n of nodes) { if (n && n.nodeType === 1) _pending.add(n); }
  if (_pending.size && !_scanFrame) _scanFrame = requestAnimationFrame(flushScan);
}

function flushScan() {
  _scanFrame = 0;
  if (!document.documentElement.classList.contains(DIM_CLASS)) { _pending.clear(); return; }
  const batch = [..._pending];
  _pending.clear();
  for (const node of batch) dimSubtree(node);
}

function dimSubtree(root) {
  dimElement(root);
  for (const el of root.querySelectorAll("div,main,aside,header,nav,section,article,footer,button")) {
    dimElement(el);
  }
}

function shouldUseComputedBg(el) {
  if (el.classList.contains("jf-element")) return true;
  // Dialogs / modals frequently use class-based backgrounds (no inline style)
  if (el.matches?.('[role="dialog"], [aria-modal="true"], [data-testid="DMDrawer"], [data-testid="sheetDialog"]')) return true;
  if (el.closest?.('[role="dialog"], [aria-modal="true"]')) return true;
  return false;
}

function dimElement(el) {
  if (!el || el.nodeType !== 1 || el.classList.contains("xdm-dimmed") || el.classList.contains("xdm-dimmed-elevated")) return;
  const bg = shouldUseComputedBg(el)
    ? (() => { try { return getComputedStyle(el).backgroundColor; } catch { return ""; } })()
    : el.style.backgroundColor;
  if (bg === "rgb(0, 0, 0)" || bg === "rgba(0, 0, 0, 1)") {
    el.classList.add("xdm-dimmed");
  } else if (bg === "rgb(24, 24, 27)") {
    el.classList.add("xdm-dimmed-elevated");
  }
}

// ── Observer & Init ────────────────────────────────────────────────

let _enabled = false;
let _observer;

function startObserver() {
  if (_observer) return;
  _observer = new MutationObserver((mutations) => {
    try {
      if (_enabled && !_suspendedForLight && !document.documentElement.classList.contains(DIM_CLASS)) {
        applyDim();
      }
      if (_enabled && document.documentElement.classList.contains(DIM_CLASS)) {
        for (const m of mutations) { if (m.addedNodes.length) queueScan(m.addedNodes); }
      }
      if (_enabled && document.body && !_bodyObserver) startBodyObserver();
    } catch {
      _observer.disconnect();
    }
  });
  _observer.observe(document.documentElement, { childList: true, subtree: true });
}

function fullRescan() {
  if (_enabled && document.body) queueScan([document.body]);
}

// Init
chrome.storage.local.get(["xdim_enabled", "xdim_theme", "xdim_customHue"], (data) => {
  _theme = data.xdim_theme ?? "dim";
  _customHue = data.xdim_customHue ?? 210;

  if (data.xdim_enabled === undefined) {
    _enabled = false;
  } else {
    _enabled = !!data.xdim_enabled;
  }
  try { localStorage.setItem("__xdm_enabled", _enabled ? "1" : "0"); } catch {}

  ensureBaseCSS();

  if (_enabled) {
    const systemDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (systemDark) {
      applyDim();
      for (const ms of [500, 1500, 3000, 5000]) setTimeout(fullRescan, ms);
    }
  } else {
    removeDim();
  }

  startObserver();
  if (_enabled && document.body) startBodyObserver();
});

// Listen for changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.xdim_enabled) {
    _enabled = !!changes.xdim_enabled.newValue;
    try { localStorage.setItem("__xdm_enabled", _enabled ? "1" : "0"); } catch {}
    if (_enabled) {
      _suspendedForLight = false;
      startBodyObserver();
      applyDim();
    } else {
      stopBodyObserver();
      removeDim();
    }
  }
  if (changes.xdim_theme || changes.xdim_customHue) {
    if (changes.xdim_theme) _theme = changes.xdim_theme.newValue ?? "dim";
    if (changes.xdim_customHue) _customHue = changes.xdim_customHue.newValue ?? 210;
    ensureBaseCSS();
    syncThemeColor();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "xdim_toggle") {
    _enabled = msg.enabled;
    if (_enabled) { applyDim(); startBodyObserver(); } else { removeDim(); stopBodyObserver(); }
    sendResponse({ ok: true });
  }
  if (msg.type === "xdim_query") {
    sendResponse({ active: document.documentElement.classList.contains(DIM_CLASS) });
  }
});
})();
