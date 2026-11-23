// ═══════════════════════════════════
//  superlevels: Photopea No Ads
//  Hides the ad column on photopea.com (the width fix lives in photopea-main.js)
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-photopea";

  const CSS = `
    /* Second column of the app row is the ad panel */
    .flexrow.app > div:nth-child(2) { display: none !important; }
    html, body { overflow: hidden !important; }
  `;

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function remove() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  chrome.storage.local.get(["photopea_enabled"], (data) => {
    if (data.photopea_enabled !== false) {
      inject();
      // Photopea rebuilds <head>; re-inject if our style gets dropped
      document.addEventListener("DOMContentLoaded", inject);
      const obs = new MutationObserver(() => {
        if (!document.getElementById(STYLE_ID)) inject();
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 15000);
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "photopea_toggle") {
      if (msg.enabled) inject();
      else remove();
    }
  });
})();
