// ═══════════════════════════════════
//  superlevels: Live CSS Editor
//  Based on live-css-editor
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-livecss";

  function applyCSS(css) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css || "";
  }

  // Load saved CSS for this host on page load
  const host = location.hostname;
  if (host) {
    chrome.storage.local.get(["feature_livecss_enabled", "livecss_" + host], (data) => {
      if (data.feature_livecss_enabled === false) return;
      const css = data["livecss_" + host];
      if (css) applyCSS(css);
    });
  }

  // Listen for live updates from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "livecss_update") {
      chrome.storage.local.get(["feature_livecss_enabled"], (data) => {
        if (data.feature_livecss_enabled !== false) {
          applyCSS(msg.css);
        }
      });
    }
    // Turned on/off in Settings: remove the CSS right away, or re-apply the
    // saved CSS, so open pages match the setting without a reload
    if (msg.type === "livecss_feature_toggle") {
      if (!msg.enabled) {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
      } else if (host) {
        chrome.storage.local.get(["livecss_" + host], (data) => {
          const css = data["livecss_" + host];
          if (css) applyCSS(css);
        });
      }
    }
  });
})();
