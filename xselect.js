// ═══════════════════════════════════
//  superlevels: X Multi-Select Replies
//  Adds a checkbox to every reply on a post page on x.com / twitter.com,
//  plus a floating bar to Hide and/or Block all selected replies at once.
//  Works by driving X's own "More" menu for each reply, one by one.
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-xselect";
  const BAR_ID = "sl-xselect-bar";
  const BOX_CLASS = "sl-xselect-box";
  const MORE_SELECTOR = 'button[aria-label="More"], [data-testid="caret"]';

  const ACTIONS = {
    hide: { item: /^hide reply$/i, confirm: /^hide( reply)?$/i, label: "Hiding" },
    block: { item: /^block @/i, confirm: /^block$/i, label: "Blocking" },
  };

  const CSS = `
    .${BOX_CLASS} {
      appearance: none; -webkit-appearance: none;
      width: 18px; height: 18px; margin: 0 4px; flex: none;
      border: 2px solid #71767b; border-radius: 5px;
      background: transparent; cursor: pointer; vertical-align: middle;
    }
    .${BOX_CLASS}:hover { border-color: #1d9bf0; }
    .${BOX_CLASS}:checked {
      background: #1d9bf0 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat;
      border-color: #1d9bf0;
    }
    article.sl-xselect-on { background: rgba(29, 155, 240, 0.1); }
    #${BAR_ID} {
      position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
      z-index: 2147483000; display: flex; align-items: center; gap: 8px;
      padding: 8px 10px 8px 16px; border-radius: 9999px;
      background: #15181c; color: #e7e9ea; border: 1px solid #2f3336;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
      font: 600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
    }
    #${BAR_ID} span { margin-right: 4px; }
    #${BAR_ID} button {
      font: inherit; color: #fff; border: 0; border-radius: 9999px;
      padding: 7px 14px; cursor: pointer; background: #2f3336;
    }
    #${BAR_ID} button:hover { filter: brightness(1.2); }
    #${BAR_ID} button[data-act="hide"] { background: #1d9bf0; }
    #${BAR_ID} button[data-act="block"],
    #${BAR_ID} button[data-act="both"] { background: #f4212e; }
    #${BAR_ID}.sl-busy button:not([data-act="stop"]) { display: none; }
    #${BAR_ID}:not(.sl-busy) button[data-act="stop"] { display: none; }
  `;

  let _enabled = false;
  let _observer = null;
  let _scheduled = false;
  let _busy = false;
  let _stop = false;
  let _status = "";
  let _lastBox = null;
  const _selected = new Set();   // status ids of selected replies

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 2500, step = 50) {
    const end = Date.now() + timeout;
    for (;;) {
      const v = fn();
      if (v || Date.now() > end) return v || null;
      await sleep(step);
    }
  }

  function fireClick(el) {
    const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }

  function pressEscape() {
    const opts = { key: "Escape", code: "Escape", keyCode: 27, bubbles: true, cancelable: true };
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", opts));
  }

  function pageStatusId() {
    return location.pathname.match(/^\/[^/]+\/status\/(\d+)/)?.[1] || null;
  }

  // The post's own permalink: its analytics link if present, else its first one.
  function articleInfo(article) {
    let first = null;
    for (const a of article.querySelectorAll('a[href*="/status/"]')) {
      const m = a.getAttribute("href").match(/^\/([^/]+)\/status\/(\d+)(\/analytics)?/);
      if (!m) continue;
      const info = { id: m[2], author: m[1].toLowerCase() };
      if (m[3]) return info;
      first = first || info;
    }
    return first;
  }

  function articleId(article) {
    return articleInfo(article)?.id || null;
  }

  // Logged-in user's handle, from the Profile link in the left nav
  function myHandle() {
    const a = document.querySelector('a[aria-label="Profile"], a[data-testid="AppTabBar_Profile_Link"]');
    return a?.getAttribute("href")?.slice(1).toLowerCase() || null;
  }

  function findArticle(id) {
    for (const article of document.querySelectorAll("article")) {
      if (article.parentElement?.closest("article")) continue;
      if (articleId(article) === id) return article;
    }
    return null;
  }

  function onBoxClick(e) {
    e.stopPropagation();
    const box = e.currentTarget;
    const boxes = [...document.querySelectorAll("." + BOX_CLASS)];
    // Shift-click selects/deselects the whole range since the last click
    let targets = [box];
    if (e.shiftKey && _lastBox && boxes.includes(_lastBox)) {
      const [a, b] = [boxes.indexOf(_lastBox), boxes.indexOf(box)].sort((x, y) => x - y);
      targets = boxes.slice(a, b + 1);
    }
    for (const t of targets) {
      if (box.checked) _selected.add(t.dataset.slId);
      else _selected.delete(t.dataset.slId);
    }
    _lastBox = box;
    tick();
  }

  function decorate() {
    const mainId = pageStatusId();
    const me = myHandle();
    for (const article of document.querySelectorAll("article")) {
      if (article.parentElement?.closest("article")) continue;   // quoted post
      const { id, author } = articleInfo(article) || {};
      let box = article.querySelector("." + BOX_CLASS);
      // No checkbox on the post itself or on your own replies
      if (!mainId || !id || id === mainId || author === me) { box?.remove(); continue; }
      if (!box) {
        const more = article.querySelector(MORE_SELECTOR);
        if (!more) continue;
        box = document.createElement("input");
        box.type = "checkbox";
        box.className = BOX_CLASS;
        box.title = "Select reply (shift-click for a range)";
        box.addEventListener("click", onBoxClick);
        for (const ev of ["pointerdown", "mousedown", "mouseup", "pointerup"]) {
          box.addEventListener(ev, (e) => e.stopPropagation());
        }
        more.before(box);
      }
      box.dataset.slId = id;
      const on = _selected.has(id);
      if (box.checked !== on) box.checked = on;
      article.classList.toggle("sl-xselect-on", on);
    }
  }

  function renderBar() {
    let bar = document.getElementById(BAR_ID);
    if (!_selected.size && !_busy && !_status) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.innerHTML = `<span></span>
        <button data-act="hide">Hide</button>
        <button data-act="block">Block</button>
        <button data-act="both">Hide + Block</button>
        <button data-act="clear">✕</button>
        <button data-act="stop">Stop</button>`;
      bar.addEventListener("click", (e) => {
        const act = e.target.closest("button")?.dataset.act;
        if (!act) return;
        if (act === "stop") _stop = true;
        else if (act === "clear") { _selected.clear(); _status = ""; tick(); }
        else run(act === "both" ? ["hide", "block"] : [act]);
      });
      document.body.appendChild(bar);
    }
    bar.classList.toggle("sl-busy", _busy);
    const text = _status || `${_selected.size} selected`;
    const span = bar.querySelector("span");
    if (span.textContent !== text) span.textContent = text;
    for (const b of bar.querySelectorAll('[data-act="hide"], [data-act="block"], [data-act="both"]')) {
      b.style.display = _selected.size ? "" : "none";
    }
  }

  // Open the reply's More menu, click the matching item, confirm if X asks.
  async function perform(id, kind) {
    const { item, confirm } = ACTIONS[kind];
    const article = await waitFor(() => findArticle(id), 1500);
    const more = article?.querySelector(MORE_SELECTOR);
    if (!more) return false;
    more.scrollIntoView({ block: "center" });
    await sleep(120);
    fireClick(more);
    const menu = await waitFor(() => document.querySelector('[role="menu"]'));
    if (!menu) return false;
    const entry = await waitFor(() =>
      [...menu.querySelectorAll('[role="menuitem"]')].find((el) => item.test(el.textContent.trim())), 1000);
    if (!entry) {
      pressEscape();
      await waitFor(() => !document.querySelector('[role="menu"]'), 1000);
      return false;
    }
    fireClick(entry);
    await waitFor(() => !document.querySelector('[role="menu"]'), 1500);

    // Optional confirmation sheet ("Block @user?" etc.)
    const dialogButtons = () => [...document.querySelectorAll(
      '[role="dialog"] button, [role="alertdialog"] button, [role="dialog"] [role="button"], [role="alertdialog"] [role="button"]')];
    const yes = await waitFor(() => dialogButtons().find((b) =>
      b.getAttribute("data-testid") === "confirmationSheetConfirm" || confirm.test(b.textContent.trim())), 1200);
    if (yes) {
      fireClick(yes);
      await sleep(400);
    }
    // Any follow-up prompt we didn't ask for (e.g. "also block?") gets dismissed
    if (document.querySelector('[role="alertdialog"], [data-testid="confirmationSheetDialog"]')) {
      pressEscape();
      await sleep(300);
    }
    await sleep(500);
    return true;
  }

  async function run(kinds) {
    if (_busy || !_selected.size) return;
    _busy = true;
    _stop = false;
    const ids = [..._selected];
    let done = 0, failed = 0;
    for (const id of ids) {
      if (_stop || !_enabled) break;
      let ok = true;
      for (const kind of kinds) {
        _status = `${ACTIONS[kind].label} ${done + failed + 1}/${ids.length}…`;
        renderBar();
        let res = false;
        try { res = await perform(id, kind); } catch (_) {}
        ok = ok && res;
      }
      if (ok) { done++; _selected.delete(id); } else failed++;
      decorate();
    }
    _busy = false;
    _status = `Done: ${done}` + (failed ? `, ${failed} failed (still selected)` : "") + (_stop ? " — stopped" : "");
    tick();
    setTimeout(() => { _status = ""; if (_enabled) tick(); }, 4000);
  }

  function tick() {
    if (!_enabled) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);
    }
    // Selection belongs to one post page; drop it when navigating elsewhere
    const page = pageStatusId();
    if (page !== tick._page) {
      tick._page = page;
      if (!_busy) _selected.clear();
    }
    decorate();
    if (document.body) renderBar();
  }

  function scheduleTick() {
    if (_scheduled) return;
    _scheduled = true;
    requestAnimationFrame(() => {
      _scheduled = false;
      tick();
    });
  }

  function start() {
    if (_observer) return;
    scheduleTick();
    _observer = new MutationObserver(scheduleTick);
    _observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stop() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    _stop = true;
    _selected.clear();
    _status = "";
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(BAR_ID)?.remove();
    for (const el of document.querySelectorAll("." + BOX_CLASS)) el.remove();
    for (const el of document.querySelectorAll(".sl-xselect-on")) el.classList.remove("sl-xselect-on");
  }

  chrome.storage.local.get(["xselect_enabled"], (data) => {
    _enabled = data.xselect_enabled !== false;
    if (_enabled) start();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "xselect_toggle") {
      _enabled = msg.enabled;
      if (_enabled) start(); else stop();
    }
  });
})();
