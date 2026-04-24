(() => {
  const STYLE_ID = "superlevels-darkmode";

  // Sites where the full-page `filter: invert(...)` approach creates so many
  // GPU compositing layers that the tab runs out of memory and crashes.
  // The re-invert rule matches every thumbnail with `[style*="background-image"]`
  // plus every `<video>` and `<iframe>`, which is lethal on video-heavy pages.
  const DARKMODE_BLOCKLIST = [
    "youtube.com",
    "youtube-nocookie.com",
    "twitch.tv",
  ];
  const host = location.hostname;
  if (DARKMODE_BLOCKLIST.some((d) => host === d || host.endsWith("." + d))) {
    return;
  }

  // CSS approach: invert the whole page, then re-invert media so images/videos look normal
  function buildCSS(brightness) {
    const b = brightness / 100;
    return `
      html.superlevels-dark {
        filter: invert(1) hue-rotate(180deg) brightness(${b}) !important;
        background: #fff !important;
      }
      html.superlevels-dark img,
      html.superlevels-dark video,
      html.superlevels-dark canvas,
      html.superlevels-dark svg image,
      html.superlevels-dark picture,
      html.superlevels-dark [style*="background-image"],
      html.superlevels-dark iframe {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      /* Don't double-invert nested media inside iframes - handled by iframe's own injection */
      /* Fix common elements that break */
      html.superlevels-dark input,
      html.superlevels-dark textarea,
      html.superlevels-dark select {
        background-color: inherit !important;
        color: inherit !important;
      }
    `;
  }

  function applyDarkMode(enabled, brightness) {
    let style = document.getElementById(STYLE_ID);
    if (enabled) {
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = buildCSS(brightness);
      document.documentElement.classList.add("superlevels-dark");
    } else {
      document.documentElement.classList.remove("superlevels-dark");
      if (style) style.remove();
    }
  }

  // Per-site storage keys (host is declared at the top for blocklist check).
  const storageKey = "darkmode_" + host;
  const globalKey = "darkmode_global";

  // Load state as early as possible to prevent flash
  chrome.storage.local.get([storageKey, globalKey, "darkmode_brightness"], (data) => {
    // Per-site overrides global. If per-site is undefined, fall back to global.
    const siteState = data[storageKey];
    const globalState = data[globalKey];
    const enabled = siteState !== undefined ? siteState : (globalState || false);
    const brightness = data.darkmode_brightness || 100;
    if (enabled) applyDarkMode(true, brightness);
  });

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "darkmode_toggle") {
      applyDarkMode(msg.enabled, msg.brightness || 100);
      sendResponse({ ok: true });
    }
    if (msg.type === "darkmode_query") {
      sendResponse({
        active: document.documentElement.classList.contains("superlevels-dark"),
        host: host,
      });
    }
  });
})();
