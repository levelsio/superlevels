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
      html.superlevels-dark [style*="background-image"],
      html.superlevels-dark iframe {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      /* Note: do NOT include <picture> here. <picture> wraps an <img> which is
         already re-inverted above; adding picture causes triple inversion and
         images render inverted/washed out (e.g. nos.nl tile images vanish). */
      /* Reddit renders post video/images inside custom-element players that use
         a shadow root (e.g. <shreddit-player-2>, <shreddit-player>). The page
         invert reaches the shadow <video>, but the "video" re-invert selector
         above can't cross the shadow boundary, so the video shows up inverted.
         Re-invert the host element instead: that cancels the page invert for the
         whole shadow subtree (video + controls) at once. */
      html.superlevels-dark shreddit-player-2,
      html.superlevels-dark shreddit-player,
      html.superlevels-dark shreddit-media-player {
        filter: invert(1) hue-rotate(180deg) !important;
      }
      /* nos.nl article tiles put a dark gradient scrim over the image (behind the
         white title). The page invert turns that scrim white and washes out the
         image, so re-invert the scrim (invert twice = original) to keep it dark.
         Match on the stable class-name suffixes, not the hashed module chunk. */
      html.superlevels-dark [class*="ItemTile"] [class*="imageWrapper"]::before,
      html.superlevels-dark [class*="ItemTile"] [class*="imageWrapper"]::after,
      html.superlevels-dark [class*="ItemTile"] [class*="__content"],
      html.superlevels-dark [class*="ItemTile"] [class*="__content"]::before,
      html.superlevels-dark [class*="ItemTile"] [class*="__content"]::after {
        filter: invert(1) hue-rotate(180deg) !important;
      }
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

  // Detect if the page's own styles already render it dark
  function parseColor(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: parts[3] !== undefined ? parts[3] : 1,
    };
  }

  function luminance(c) {
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  }

  function pageBgIsDark() {
    // Temporarily strip our class so getComputedStyle reflects the page's own bg
    const html = document.documentElement;
    const had = html.classList.contains("superlevels-dark");
    if (had) html.classList.remove("superlevels-dark");

    let bg = null;
    if (document.body) {
      const c = parseColor(getComputedStyle(document.body).backgroundColor);
      if (c && c.a > 0.5) bg = c;
    }
    if (!bg) {
      const c = parseColor(getComputedStyle(html).backgroundColor);
      if (c && c.a > 0.5) bg = c;
    }

    if (had) html.classList.add("superlevels-dark");

    if (!bg) return false;
    return luminance(bg) < 0.35;
  }

  // Get hostname for per-site storage
  const host = location.hostname;
  const storageKey = "darkmode_" + host;
  const globalKey = "darkmode_global";
  const pageDarkKey = "darkmode_pageIsDark_" + host;

  // Stored values: true/"on" = always dark, false/"off" = never, "system" =
  // follow the OS light/dark setting. Old boolean values keep working.
  function normalizeMode(raw) {
    if (raw === true || raw === "on") return "on";
    if (raw === "system") return "system";
    return "off";
  }

  const systemDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  let currentMode = "off";
  let currentBrightness = 100;
  let featureEnabled = true;

  // Turn dark mode on, unless the page is already dark by its own styles.
  // fresh=true ignores the cached "this site is natively dark" result and
  // checks the page again (used when the user changes a setting).
  function enableUnlessNativelyDark(fresh) {
    chrome.storage.local.get([pageDarkKey], (data) => {
      if (!fresh && data[pageDarkKey]) {
        applyDarkMode(false, 0);
        return;
      }
      if (fresh && pageBgIsDark()) {
        applyDarkMode(false, 0);
        chrome.storage.local.set({ [pageDarkKey]: true });
        return;
      }
      if (fresh) chrome.storage.local.remove(pageDarkKey);
      applyDarkMode(true, currentBrightness);

      // Re-verify once body styles are computed
      const recheck = () => {
        if (pageBgIsDark()) {
          applyDarkMode(false, 0);
          chrome.storage.local.set({ [pageDarkKey]: true });
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", recheck, { once: true });
      } else {
        recheck();
      }
    });
  }

  function shouldBeDark() {
    if (!featureEnabled) return false;
    if (currentMode === "on") return true;
    if (currentMode === "system") return !!(systemDark && systemDark.matches);
    return false;
  }

  function evaluateAndApply(fresh) {
    chrome.storage.local.get(
      ["feature_darkmode_enabled", storageKey, globalKey, "darkmode_brightness"],
      (data) => {
        featureEnabled = data.feature_darkmode_enabled !== false;
        // Per-site overrides global. If per-site is undefined, fall back to global.
        const rawSite = data[storageKey];
        currentMode = normalizeMode(rawSite !== undefined ? rawSite : data[globalKey]);
        currentBrightness = data.darkmode_brightness || 100;

        if (shouldBeDark()) {
          enableUnlessNativelyDark(fresh);
        } else {
          applyDarkMode(false, 0);
          if (fresh) chrome.storage.local.remove(pageDarkKey);
        }
      }
    );
  }

  // Load state as early as possible to prevent flash
  evaluateAndApply(false);

  // Follow the system light/dark setting live when in "system" mode
  if (systemDark && systemDark.addEventListener) {
    systemDark.addEventListener("change", () => {
      if (featureEnabled && currentMode === "system") evaluateAndApply(false);
    });
  }

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "darkmode_toggle") {
      // The popup saves the new state first; re-read it and re-check the page
      evaluateAndApply(true);
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
