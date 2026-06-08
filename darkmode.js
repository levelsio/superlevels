(() => {
  const STYLE_ID = "superlevels-darkmode";

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

  // Get hostname for per-site storage
  const host = location.hostname;
  const storageKey = "darkmode_" + host;
  const globalKey = "darkmode_global";

  let currentMode = "off";
  let currentBrightness = 100;

  function evaluateAndApply() {
    chrome.storage.local.get(["feature_darkmode_enabled", storageKey, globalKey, "darkmode_brightness"], (data) => {
      if (data.feature_darkmode_enabled === false) {
        applyDarkMode(false, 100);
        return;
      }
      const rawSite = data[storageKey];
      const rawGlobal = data[globalKey];
      const rawMode = rawSite !== undefined ? rawSite : (rawGlobal !== undefined ? rawGlobal : "off");
      
      let mode = "off";
      if (rawMode === true || rawMode === "on") mode = "on";
      else if (rawMode === false || rawMode === "off") mode = "off";
      else if (rawMode === "system") mode = "system";

      currentMode = mode;
      currentBrightness = data.darkmode_brightness || 100;

      let shouldEnable = false;
      if (mode === "on") {
        shouldEnable = true;
      } else if (mode === "off") {
        shouldEnable = false;
      } else if (mode === "system") {
        shouldEnable = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      applyDarkMode(shouldEnable, currentBrightness);
    });
  }

  // Load state immediately
  evaluateAndApply();

  // Listen to system color scheme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", () => {
      if (currentMode === "system") {
        applyDarkMode(mediaQuery.matches, currentBrightness);
      }
    });
  }

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "darkmode_toggle") {
      evaluateAndApply();
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "darkmode_query") {
      sendResponse({
        active: document.documentElement.classList.contains("superlevels-dark"),
        host: host,
      });
    }
  });
})();
