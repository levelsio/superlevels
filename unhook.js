// ═══════════════════════════════════
//  superlevels: YouTube Unhook
//  Based on remove-youtube-suggestions
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-unhook";

  const FEATURE_CSS = {
    homepage: `
      /* Homepage: hide feed entirely */
      ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] #primary > ytd-rich-grid-renderer,
      ytd-browse[page-subtype="home"] ytd-rich-section-list-renderer,
      ytd-browse[page-subtype="home"] #header,
      ytd-browse[page-subtype="home"] .ytd-browse-chips-wrapper {
        display: none !important;
      }
      /* Black homepage background with message */
      ytd-browse[page-subtype="home"] #primary {
        display: flex !important;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
      }
      ytd-browse[page-subtype="home"] #primary::before {
        content: 'Focus Mode — Use the search bar';
        font-size: 20px;
        color: #444;
        font-family: 'YouTube Sans', 'Roboto', sans-serif;
        font-weight: 500;
      }
      /* Trending / Explore feed */
      ytd-browse[page-subtype="trending"] #contents {
        display: none !important;
      }
      /* Homepage chips / categories bar */
      #chips-wrapper.ytd-feed-filter-chip-bar-renderer,
      ytd-feed-filter-chip-bar-renderer {
        display: none !important;
      }
    `,
    sidebar: `
      /* Sidebar suggestions on video pages */
      #secondary.ytd-watch-flexy,
      ytd-watch-next-secondary-results-renderer,
      #related {
        display: none !important;
      }
      /* "For You" / recommendation shelves */
      ytd-rich-shelf-renderer {
        display: none !important;
      }
    `,
    endscreen: `
      /* End screen suggestions & cards */
      .ytp-ce-element,
      .ytp-endscreen-content,
      .ytp-suggestion-set,
      .ytp-cards-teaser,
      .ytp-ce-covering-overlay,
      .ytp-ce-element-show {
        display: none !important;
      }
    `,
    shorts: `
      /* Shorts shelf */
      ytd-rich-shelf-renderer[is-shorts],
      ytd-reel-shelf-renderer {
        display: none !important;
      }
    `,
    wider: `
      /* Make video player wider without sidebar */
      ytd-watch-flexy[flexy][is-two-columns_] #primary.ytd-watch-flexy {
        max-width: 100% !important;
      }
    `,
  };

  const DEFAULT_FEATURES = {
    homepage: true,
    sidebar: true,
    endscreen: true,
    shorts: true,
    wider: true,
  };

  function buildCSS(features) {
    return Object.keys(FEATURE_CSS)
      .filter((key) => features[key] !== false)
      .map((key) => FEATURE_CSS[key])
      .join("\n");
  }

  function apply(enabled, features) {
    const existing = document.getElementById(STYLE_ID);
    if (!enabled) {
      if (existing) existing.remove();
      return;
    }
    const css = buildCSS(features || DEFAULT_FEATURES);
    if (existing) {
      existing.textContent = css;
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  chrome.storage.local.get(["unhook_enabled", "unhook_features"], (data) => {
    apply(data.unhook_enabled !== false, data.unhook_features);
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "unhook_toggle") {
      apply(msg.enabled, msg.features);
    }
  });
})();
