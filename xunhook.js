// ═══════════════════════════════════
//  superlevels: X Unhook
//  Hides distractions on x.com / twitter.com
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-xunhook";

  const XUNHOOK_CSS = `
    /* Right sidebar — keep the search bar at top, hide all panels below
       (Live on X, Today's News, What's happening, Who to follow, Premium upsell, etc.).
       The first child of SidebarContents is the search; everything after is a panel. */
    div[data-testid="sidebarColumn"] > div > div > div > div > div > div:not(:first-of-type) {
      display: none !important;
    }
    /* New x-web sidebar (no sidebarColumn testid): every panel is a rounded
       <section> card with an <h2> title inside <aside>; search isn't a section.
       .sl-xunhook-hidden is the heading-text fallback set from JS below. */
    aside section.rounded-2xl:has(h2),
    .sl-xunhook-hidden {
      display: none !important;
    }
    /* Explore link in left nav */
    header[role="banner"] nav a[href="/explore"] {
      display: none !important;
    }
    /* Explore link inside the More overflow dialog */
    div[aria-labelledby="modal-header"] a[href="/explore"] {
      display: none !important;
    }
  `;

  // Fallback for panels whose markup the CSS above misses: match the panel title
  const PANEL_TITLES = /^(live on x|today.s news|what.s happening|who to follow|trends for you|trending now|subscribe to premium|relevant people|you might like)$/i;
  let _observer = null;

  function hidePanels() {
    for (const h of document.querySelectorAll("h2")) {
      if (!PANEL_TITLES.test(h.textContent.trim())) continue;
      // Sidebar only: the timeline also has inline "Who to follow" carousels whose
      // closest <section> is the entire posts timeline
      if (h.closest('[data-testid="primaryColumn"]')) continue;
      const panel = h.closest("section");
      if (panel && panel.closest('aside, [data-testid="sidebarColumn"]') &&
          !panel.querySelector('input[type="search"], form[role="search"]')) {
        panel.classList.add("sl-xunhook-hidden");
      }
    }
  }

  let _frame = 0;
  function startObserver() {
    if (_observer) return;
    _observer = new MutationObserver(() => {
      if (!_frame) _frame = requestAnimationFrame(() => { _frame = 0; hidePanels(); });
    });
    _observer.observe(document.documentElement, { childList: true, subtree: true });
    hidePanels();
  }

  function stopObserver() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    for (const el of document.querySelectorAll(".sl-xunhook-hidden")) el.classList.remove("sl-xunhook-hidden");
  }

  function inject() {
    startObserver();
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = XUNHOOK_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function remove() {
    stopObserver();
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  chrome.storage.local.get(["xunhook_enabled"], (data) => {
    if (data.xunhook_enabled !== false) inject();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "xunhook_toggle") {
      if (msg.enabled) inject();
      else remove();
    }
  });
})();
