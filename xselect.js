// ═══════════════════════════════════
//  superlevels: X Multi-Select Replies
//  Adds a checkbox to every reply on a post page on x.com / twitter.com,
//  plus a floating bar to Hide and/or Block all selected replies at once.
//  Works by driving X's own "More" menu for each reply, one by one.
//  "Scan AI" sends the replies to xAI (via background.js, with your own key)
//  and pre-ticks the ones that look AI-generated so you can review them.
//  It also adds "AI score" to X's "Sort replies" menu: X's reply list is
//  virtualized (only a few replies exist in the page at a time) so it can't be
//  reordered in place; instead a side panel lists every scanned reply, highest
//  score first, with the same checkboxes.
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-xselect";
  const BAR_ID = "sl-xselect-bar";
  const BOX_CLASS = "sl-xselect-box";
  const BADGE_CLASS = "sl-xselect-badge";
  const PANEL_ID = "sl-xselect-panel";
  const SORT_ITEM_ID = "sl-xselect-sort";
  const SORT_BTN_SELECTOR = 'button[aria-label^="Sort replies"]';
  const SORT_LABEL = "AI score";
  const MORE_SELECTOR = 'button[aria-label="More"], [data-testid="caret"]';
  const TEXT_SELECTOR = '[data-testid="tweetText"], div[dir="auto"]';
  const AI_THRESHOLD = 70;   // score (0-100) at which a reply gets pre-ticked
  const AI_BATCH = 25;       // replies per xAI request

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
    .${BADGE_CLASS} {
      flex: none; padding: 1px 7px; border-radius: 9999px; cursor: help;
      font: 700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #fff; background: #f4212e; white-space: nowrap;
    }
    .${BADGE_CLASS}.sl-low { background: transparent; color: #71767b; border: 1px solid #2f3336; }
    #${PANEL_ID} {
      position: fixed; top: 64px; bottom: 84px; width: 350px; z-index: 2147482999;
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid rgba(113, 118, 123, 0.4); border-radius: 16px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
      font: 400 14px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${PANEL_ID} header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 10px 10px 14px; font-weight: 700; font-size: 15px;
      border-bottom: 1px solid rgba(113, 118, 123, 0.4);
    }
    #${PANEL_ID} header small { font-weight: 400; color: #71767b; margin-left: 6px; }
    #${PANEL_ID} header button {
      border: 0; background: transparent; color: inherit; cursor: pointer;
      font-size: 15px; padding: 4px 8px; border-radius: 9999px;
    }
    #${PANEL_ID} header button:hover { background: rgba(113, 118, 123, 0.2); }
    #${PANEL_ID} .sl-rows { overflow-y: auto; flex: 1; }
    #${PANEL_ID} .sl-row {
      display: flex; gap: 8px; padding: 9px 12px; cursor: pointer;
      border-bottom: 1px solid rgba(113, 118, 123, 0.25);
    }
    #${PANEL_ID} .sl-row:hover { background: rgba(113, 118, 123, 0.1); }
    #${PANEL_ID} .sl-row.sl-on { background: rgba(29, 155, 240, 0.12); }
    #${PANEL_ID} .sl-row .${BOX_CLASS} { margin: 1px 0 0; }
    #${PANEL_ID} .sl-body { min-width: 0; flex: 1; }
    #${PANEL_ID} .sl-head { display: flex; align-items: center; gap: 6px; font-weight: 700; }
    #${PANEL_ID} .sl-head b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #${PANEL_ID} .sl-head b:hover { text-decoration: underline; }
    #${PANEL_ID} .sl-row { user-select: none; }
    #${PANEL_ID} .sl-row .${BOX_CLASS} { pointer-events: none; }
    #${PANEL_ID} .sl-text {
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      overflow: hidden; overflow-wrap: anywhere; margin-top: 2px;
    }
    #${PANEL_ID} .sl-why { color: #71767b; font-size: 12px; margin-top: 3px; }
    #${SORT_ITEM_ID}[data-highlighted] { background: rgba(113, 118, 123, 0.15); }
    #${BAR_ID} {
      position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
      z-index: 2147483000; display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border-radius: 9999px;
      background: #15181c; color: #e7e9ea; border: 1px solid #2f3336;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
      font: 600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
    }
    #${BAR_ID} span { margin: 0 4px 0 6px; }
    #${BAR_ID} button {
      font: inherit; color: #fff; border: 0; border-radius: 9999px;
      padding: 7px 14px; cursor: pointer; background: #2f3336;
    }
    #${BAR_ID} button:hover { filter: brightness(1.2); }
    #${BAR_ID} button[data-act="hide"] { background: #1d9bf0; }
    #${BAR_ID} button[data-act="scan"] { background: #7856ff; }
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
  const _replies = new Map();    // id -> { handle, text, y } for every reply seen on this page
  const _scores = new Map();     // id -> { score, reason } from the AI scan
  let _postText = "";
  let _sortAI = false;           // "AI score" picked in X's sort menu
  let _panelSig = "";

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

  function articleText(article) {
    for (const el of article.querySelectorAll(TEXT_SELECTOR)) {
      if (el.closest("article") === article) return el.innerText.trim();   // not the quoted post's
    }
    return "";
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
    const boxes = [...document.querySelectorAll(`article .${BOX_CLASS}`)];
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
      if (id && id === mainId) _postText = articleText(article) || _postText;
      // No checkbox on the post itself or on your own replies
      if (!mainId || !id || id === mainId || author === me) { box?.remove(); continue; }
      // Remember every reply (X unloads them as you scroll) for the AI scan
      _replies.set(id, {
        handle: author,
        text: articleText(article),
        y: article.getBoundingClientRect().top + window.scrollY,
      });
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

      let badge = article.querySelector("." + BADGE_CLASS);
      const res = _scores.get(id);
      if (!res) { badge?.remove(); continue; }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = BADGE_CLASS;
        box.before(badge);
      }
      const label = `AI ${res.score}%`;
      if (badge.textContent !== label) badge.textContent = label;
      badge.title = res.reason || "";
      badge.classList.toggle("sl-low", res.score < AI_THRESHOLD);
    }
  }

  // Scroll through the thread so X loads (and decorate() records) every reply
  async function loadAllReplies() {
    const startY = window.scrollY;
    let still = 0;
    for (let i = 0; i < 80 && still < 3 && !_stop; i++) {
      const before = _replies.size;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      window.scrollBy(0, window.innerHeight * 0.8);
      await sleep(450);
      decorate();
      still = (atBottom && _replies.size === before) ? still + 1 : 0;
      _status = `Loading replies… ${_replies.size}`;
      renderBar();
    }
    window.scrollTo(0, startY);
    await sleep(300);
  }

  async function scan() {
    if (_busy) return;
    _busy = true;
    _stop = false;
    let flagged = 0, error = "";
    try {
      await loadAllReplies();
      const todo = [..._replies].filter(([id, r]) => !_scores.has(id) && r.text);
      const post = _postText || document.title.replace(/^.*? on X: "/, "").replace(/" \/ X$/, "");
      for (let i = 0; i < todo.length && !_stop && _enabled; i += AI_BATCH) {
        _status = `Asking xAI… ${Math.min(i + AI_BATCH, todo.length)}/${todo.length}`;
        renderBar();
        const batch = todo.slice(i, i + AI_BATCH);
        const res = await chrome.runtime.sendMessage({
          type: "xselect_scan",
          post,
          replies: batch.map(([id, r]) => ({ id, handle: r.handle, text: r.text.slice(0, 1000) })),
        });
        if (!res || res.error) { error = res?.error || "No response from extension"; break; }
        for (const r of res.results) {
          if (!_replies.has(r.id)) continue;
          _scores.set(r.id, { score: r.score, reason: r.reason });
          if (r.score >= AI_THRESHOLD) { _selected.add(r.id); flagged++; }
        }
        decorate();
      }
    } catch (e) {
      error = e?.message || String(e);
    }
    _busy = false;
    if (!error && _scores.size) _sortAI = true;   // show the ranking by default after a scan
    _status = error ? `Scan failed: ${error}` : `${flagged} look AI — review, then Hide/Block`;
    tick();
    setTimeout(() => { _status = ""; if (_enabled) tick(); }, error ? 8000 : 5000);
  }

  // ── "AI score" entry in X's own "Sort replies" dropdown ──
  function setSortAI(on) {
    _sortAI = on;
    if (on && !_scores.size) scan();   // nothing scored yet: scan first, then rank
    tick();
  }

  function decorateSortMenu() {
    const group = document.querySelector('[role="menu"] [role="group"][aria-label="Sort replies"]');
    if (group) {
      let item = document.getElementById(SORT_ITEM_ID);
      if (!item || item.parentElement !== group) {
        const model = [...group.querySelectorAll('[role="menuitemradio"]')].pop();
        if (!model) return;
        item = model.cloneNode(true);
        item.id = SORT_ITEM_ID;
        item.tabIndex = -1;
        item.removeAttribute("data-highlighted");
        item.addEventListener("mouseenter", () => item.setAttribute("data-highlighted", ""));
        item.addEventListener("mouseleave", () => item.removeAttribute("data-highlighted"));
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          pressEscape();
          setSortAI(true);
        });
        // Picking one of X's own sorts turns ours off
        group.addEventListener("click", (e) => {
          const picked = e.target.closest?.('[role="menuitemradio"]');
          if (picked && picked.id !== SORT_ITEM_ID && _sortAI) setSortAI(false);
        }, true);
        group.appendChild(item);
      }
      const label = SORT_LABEL + (_sortAI ? " ✓" : "");
      const span = item.querySelector("span");
      if (span && span.textContent !== label) span.textContent = label;
      item.setAttribute("aria-checked", String(_sortAI));
    }
    // Reflect the choice on the dropdown button itself ("Relevant ⌄" -> "AI score ⌄")
    const btn = document.querySelector(SORT_BTN_SELECTOR);
    const node = btn?.querySelector("span")?.firstChild;
    if (node?.nodeType === Node.TEXT_NODE) {
      const real = btn.getAttribute("aria-label").replace(/^Sort replies:\s*/, "");
      const want = _sortAI ? SORT_LABEL : real;
      if (node.nodeValue !== want && (_sortAI || node.nodeValue === SORT_LABEL)) node.nodeValue = want;
    }
  }

  function jumpToReply(id) {
    const r = _replies.get(id);
    const article = findArticle(id);
    if (article) article.scrollIntoView({ block: "center" });
    else if (r) window.scrollTo(0, Math.max(0, r.y - window.innerHeight / 3));
  }

  // Every scanned reply, highest AI score first
  function renderPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!_sortAI || !_scores.size || !pageStatusId()) { panel?.remove(); _panelSig = ""; return; }
    const rows = [..._scores]
      .filter(([id]) => _replies.has(id))
      .sort((a, b) => b[1].score - a[1].score);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.innerHTML = `<header><div>Replies by AI score<small></small></div><button title="Close">✕</button></header><div class="sl-rows"></div>`;
      panel.querySelector("header button").addEventListener("click", () => setSortAI(false));
      panel.querySelector(".sl-rows").addEventListener("click", (e) => {
        const row = e.target.closest(".sl-row");
        if (!row) return;
        const id = row.dataset.slId;
        // The @handle jumps to the reply in the thread; anywhere else toggles it
        if (e.target.closest("b")) { jumpToReply(id); return; }
        if (_selected.has(id)) _selected.delete(id); else _selected.add(id);
        tick();
      });
      document.body.appendChild(panel);
      _panelSig = "";
    }
    // Match X's current theme, and dock in the empty space right of the timeline
    const sample = document.querySelector("article") || document.body;
    panel.style.background = getComputedStyle(document.body).backgroundColor;
    panel.style.color = getComputedStyle(sample).color;
    const col = document.querySelector("main")?.getBoundingClientRect();
    const room = col ? window.innerWidth - col.right : 0;
    if (room >= 370) { panel.style.left = (col.right + 12) + "px"; panel.style.right = ""; }
    else { panel.style.left = ""; panel.style.right = "8px"; }

    const sig = rows.map(([id, r]) => `${id}:${r.score}:${_selected.has(id) ? 1 : 0}`).join(",");
    if (sig === _panelSig) return;
    _panelSig = sig;
    panel.querySelector("small").textContent = `${rows.length} scanned`;
    const list = panel.querySelector(".sl-rows");
    const keep = list.scrollTop;
    list.textContent = "";
    for (const [id, res] of rows) {
      const reply = _replies.get(id);
      const row = document.createElement("div");
      row.className = "sl-row" + (_selected.has(id) ? " sl-on" : "");
      row.dataset.slId = id;
      row.title = "Click to select";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.className = BOX_CLASS + " sl-panel-box";
      box.checked = _selected.has(id);
      const body = document.createElement("div");
      body.className = "sl-body";
      const head = document.createElement("div");
      head.className = "sl-head";
      const badge = document.createElement("span");
      badge.className = BADGE_CLASS + (res.score < AI_THRESHOLD ? " sl-low" : "");
      badge.textContent = `AI ${res.score}%`;
      const name = document.createElement("b");
      name.textContent = "@" + reply.handle;
      name.title = "Jump to this reply";
      head.append(badge, name);
      const text = document.createElement("div");
      text.className = "sl-text";
      text.textContent = reply.text;
      const why = document.createElement("div");
      why.className = "sl-why";
      why.textContent = res.reason || "";
      body.append(head, text, why);
      row.append(box, body);
      list.appendChild(row);
    }
    list.scrollTop = keep;
  }

  function renderBar() {
    let bar = document.getElementById(BAR_ID);
    // Show on any post page that has replies, so Scan AI is always reachable
    const show = _selected.size || _busy || _status || (pageStatusId() && _replies.size);
    if (!show) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.innerHTML = `<span></span>
        <button data-act="scan" title="Find AI-written replies with xAI">Scan AI</button>
        <button data-act="hide">Hide</button>
        <button data-act="block">Block</button>
        <button data-act="both">Hide + Block</button>
        <button data-act="clear">✕</button>
        <button data-act="stop">Stop</button>`;
      bar.addEventListener("click", (e) => {
        const act = e.target.closest("button")?.dataset.act;
        if (!act) return;
        if (act === "stop") _stop = true;
        else if (act === "scan") scan();
        else if (act === "clear") { _selected.clear(); _status = ""; tick(); }
        else run(act === "both" ? ["hide", "block"] : [act]);
      });
      document.body.appendChild(bar);
    }
    bar.classList.toggle("sl-busy", _busy);
    const text = _status || (_selected.size ? `${_selected.size} selected` : "");
    const span = bar.querySelector("span");
    if (span.textContent !== text) span.textContent = text;
    span.style.display = text ? "" : "none";
    for (const b of bar.querySelectorAll('[data-act="hide"], [data-act="block"], [data-act="both"], [data-act="clear"]')) {
      b.style.display = _selected.size ? "" : "none";
    }
  }

  // Open the reply's More menu, click the matching item, confirm if X asks.
  async function perform(id, kind) {
    const { item, confirm } = ACTIONS[kind];
    if (!findArticle(id) && _replies.has(id)) {
      // X unloaded it; go back to where we last saw it
      window.scrollTo(0, Math.max(0, _replies.get(id).y - window.innerHeight / 2));
    }
    const article = await waitFor(() => findArticle(id), 2500);
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
      if (ok) { done++; _selected.delete(id); _scores.delete(id); } else failed++;
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
      if (!_busy) { _selected.clear(); _replies.clear(); _scores.clear(); _postText = ""; _sortAI = false; }
    }
    decorate();
    decorateSortMenu();
    if (document.body) { renderBar(); renderPanel(); }
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
    _replies.clear();
    _scores.clear();
    _status = "";
    _sortAI = false;
    decorateSortMenu();   // put X's own label back on the sort button
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(BAR_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(SORT_ITEM_ID)?.remove();
    for (const el of document.querySelectorAll(`.${BOX_CLASS}, .${BADGE_CLASS}`)) el.remove();
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
