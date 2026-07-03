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

  // Load state as early as possible to prevent flash
  chrome.storage.local.get(
    [storageKey, globalKey, "darkmode_brightness", pageDarkKey],
    (data) => {
      const siteState = data[storageKey];
      const globalState = data[globalKey];
      const enabled =
        siteState !== undefined ? siteState : globalState || false;
      const brightness = data.darkmode_brightness || 100;
      if (!enabled) return;

      // Skip immediately if we've previously detected this site as natively dark
      if (data[pageDarkKey]) return;

      applyDarkMode(true, brightness);

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
    }
  );

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "darkmode_toggle") {
      if (!msg.enabled) {
        applyDarkMode(false, 0);
        chrome.storage.local.remove(pageDarkKey);
        sendResponse({ ok: true, skipped: false });
        return;
      }
      // Enabling: skip if the page is already dark by its own styles
      if (pageBgIsDark()) {
        applyDarkMode(false, 0);
        chrome.storage.local.set({ [pageDarkKey]: true });
        sendResponse({ ok: true, skipped: true });
      } else {
        chrome.storage.local.remove(pageDarkKey);
        applyDarkMode(true, msg.brightness || 100);
        sendResponse({ ok: true, skipped: false });
      }
    }
    if (msg.type === "darkmode_query") {
      sendResponse({
        active: document.documentElement.classList.contains("superlevels-dark"),
        host: host,
      });
    }
  });
})();
