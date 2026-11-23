// ═══════════════════════════════════
//  superlevels: View Image for Google Images
//  Adds a floating "View Image" button on the image preview panel
// ═══════════════════════════════════
(() => {
  chrome.storage.local.get(["feature_viewimage_enabled"], (data) => {
    if (data.feature_viewimage_enabled === false) return;

    const BUTTON_CLASS = "sl-view-image";

    const style = document.createElement("style");
    style.textContent = `
      .${BUTTON_CLASS} {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(0,0,0,0.75);
        color: #fff !important;
        font-size: 13px;
        font-weight: 500;
        font-family: Google Sans, Roboto, Arial, sans-serif;
        text-decoration: none !important;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.2);
        cursor: pointer;
        backdrop-filter: blur(8px);
        transition: background 0.2s;
        white-space: nowrap;
      }
      .${BUTTON_CLASS}:hover {
        background: rgba(0,0,0,0.9);
        border-color: rgba(255,255,255,0.4);
      }
      .${BUTTON_CLASS}:visited { color: #fff !important; }
      .${BUTTON_CLASS} svg { flex-shrink: 0; }
    `;
    document.head.appendChild(style);

    // Parse AF_initDataCallback to map thumbnail src -> full resolution URL
    const imageMap = {};

    function parseImageData() {
      try {
        const html = document.documentElement.innerHTML;
        const starts = [];
        const search = "AF_initDataCallback(";
        let idx = 0;
        while ((idx = html.indexOf(search, idx)) !== -1) {
          starts.push(idx + search.length);
          idx += search.length;
        }
        for (const start of starts) {
          try {
            const end = html.indexOf(");</script>", start);
            if (end === -1) continue;
            const chunk = html.slice(start, end);
            const dsMatch = chunk.match(/key:\s*'ds:(\d+)'/);
            if (!dsMatch || dsMatch[1] !== "1") continue;
            const dataMatch = chunk.match(/data:(\[[\s\S]*\])\s*,\s*sideChannel/);
            if (!dataMatch) continue;
            const data = JSON.parse(dataMatch[1]);
            // Try path 1
            try {
              const meta = data[31][0][12][2];
              for (const item of meta) {
                try { imageMap[item[1][2][0]] = item[1][3][0]; } catch {}
              }
            } catch {}
            // Try path 2
            try {
              const meta = data[56][1][0][0][1][0];
              for (const item of meta) {
                try {
                  const inner = Object.values(item[0][0])[0];
                  imageMap[inner[1][2][0]] = inner[1][3][0];
                } catch {}
              }
            } catch {}
          } catch {}
        }
      } catch {}
    }

    parseImageData();

    function getFullImageUrl() {
      // Find large preview images (the main one in the side panel)
      const imgs = document.querySelectorAll("img[src][jsaction]");
      for (const img of imgs) {
        const rect = img.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) continue;
        if (img.src in imageMap) return imageMap[img.src];
        if (img.src && !img.src.startsWith("data:") && !img.src.includes("encrypted-tbn")) {
          return img.src;
        }
      }
      // Also try images without jsaction but that are large
      const allImgs = document.querySelectorAll("img[src]");
      for (const img of allImgs) {
        const rect = img.getBoundingClientRect();
        if (rect.width < 200 || rect.height < 200) continue;
        if (img.src in imageMap) return imageMap[img.src];
      }
      // Fallback: URL params
      try {
        const u = new URLSearchParams(window.location.search).get("imgurl");
        if (u) return u;
      } catch {}
      return null;
    }

    function findImageContainer() {
      // The large preview image in the side panel — find its positioned ancestor
      const imgs = document.querySelectorAll("img[src][jsaction]");
      for (const img of imgs) {
        const rect = img.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) continue;
        // Walk up to find the container div that holds just the image
        let el = img.parentElement;
        while (el && el !== document.body) {
          const style = getComputedStyle(el);
          if (style.position === "relative" || style.position === "absolute") {
            return el;
          }
          el = el.parentElement;
        }
        // If no positioned ancestor, use direct parent and make it relative
        img.parentElement.style.position = "relative";
        return img.parentElement;
      }
      return null;
    }

    function inject() {
      // Remove old buttons
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((el) => el.remove());

      const imageUrl = getFullImageUrl();
      if (!imageUrl) return;
      // Only allow http/https URLs to prevent javascript: injection
      if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) return;

      const container = findImageContainer();
      if (!container) return;

      // Don't add duplicate
      if (container.querySelector(`.${BUTTON_CLASS}`)) return;

      const btn = document.createElement("a");
      btn.className = BUTTON_CLASS;
      btn.href = imageUrl;
      btn.target = "_blank";
      btn.rel = "noreferrer";
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-.9 2-2V5c0-1-1-2-2-2zM5 17l3.5-4.5 2.5 3.01L14.5 11l4.5 6H5z"/></svg> View Image`;

      container.appendChild(btn);
    }

    // Throttle observer to avoid performance issues
    let timeout = null;
    const observer = new MutationObserver(() => {
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = null;
        inject();
      }, 200);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    inject();
  });
})();
