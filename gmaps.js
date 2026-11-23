// ═══════════════════════════════════
//  superlevels: Re-introduce Google Maps links
//  Adds "Maps" tab + makes map thumbnails clickable on Google Search
// ═══════════════════════════════════
(() => {
  chrome.storage.local.get(["feature_gmaps_enabled"], (data) => {
    if (data.feature_gmaps_enabled === false) return;

    const style = document.createElement("style");
    style.textContent = `
      .sl-maps-btn {
        opacity: 0;
        font-size: 14px;
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: #202124;
        color: #e8eaed !important;
        cursor: pointer;
        padding: 8px 20px;
        border-radius: 20px;
        text-decoration: none !important;
        border: 1px solid #3c4043;
        transition: opacity 0.3s ease;
        white-space: nowrap;
        z-index: 10;
        font-family: Google Sans, Roboto, arial, sans-serif;
      }
      .sl-maps-btn:hover { background: #3c4043; }
      .sl-maps-btn:visited { color: #e8eaed !important; }
      .sl-maps-tab:hover { text-decoration: none !important; }
    `;
    document.head.appendChild(style);

    function buildMapsLink() {
      const q = new URLSearchParams(window.location.search).get("q");
      const url = new URL(window.location);
      const host = url.hostname;
      const mapsHost = host.startsWith("www.") ? host.replace("www.", "maps.") : `maps.${host}`;
      return `${url.protocol}//${mapsHost}/maps?q=${encodeURIComponent(q || "")}`;
    }

    const mapsUrl = buildMapsLink();
    let added = false;

    // Add "Maps" tab in the tab bar
    const tabsContainer = document.querySelector(".beZ0tf");
    if (tabsContainer) {
      // Check if Maps tab already exists
      const existing = Array.from(tabsContainer.querySelectorAll("a")).some((a) => a.href?.includes("/maps"));
      if (!existing) {
        const wrapper = document.createElement("div");
        wrapper.role = "listitem";
        const link = document.createElement("a");
        link.href = mapsUrl;
        link.classList.add("C6AK7c", "sl-maps-tab");
        const inner = document.createElement("div");
        inner.classList.add("mXwfNd");
        const span = document.createElement("span");
        span.classList.add("R1QWuf");
        span.textContent = "Maps";
        inner.appendChild(span);
        link.appendChild(inner);
        wrapper.appendChild(link);
        const children = tabsContainer.children;
        if (children.length >= 2) {
          tabsContainer.insertBefore(wrapper, children[2]);
        } else {
          tabsContainer.appendChild(wrapper);
        }
        added = true;
      }
    }

    // Add "Maps" bubble button
    const buttonContainer = document.querySelector(".IUOThf");
    if (buttonContainer && !added) {
      const btn = document.createElement("a");
      btn.classList.add("nPDzT", "T3FoJb");
      btn.href = mapsUrl;
      const div = document.createElement("div");
      div.classList.add("GKS7s");
      const span = document.createElement("span");
      span.classList.add("FMKtTb", "UqcIvb");
      span.textContent = "Maps";
      div.appendChild(span);
      btn.appendChild(div);
      buttonContainer.prepend(btn);
    }

    // Make small map thumbnails clickable
    [".lu-fs", ".V1GY4c"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (el.parentNode.tagName.toLowerCase() === "a") {
        el.parentNode.href = mapsUrl;
      } else {
        const wrap = document.createElement("a");
        wrap.href = mapsUrl;
        el.parentNode.insertBefore(wrap, el);
        el.parentNode.removeChild(el);
        wrap.appendChild(el);
      }
    });

    // Add "Open in Maps" overlay button on map containers
    function addOverlayButton(container) {
      if (!container) return;
      container.style.position = "relative";
      const btn = document.createElement("a");
      btn.href = mapsUrl;
      btn.textContent = "Open in Maps";
      btn.className = "sl-maps-btn";
      container.appendChild(btn);
      setTimeout(() => { btn.style.opacity = "1"; }, 100);
    }

    addOverlayButton(document.querySelector(".lu_map_section")); // address map
    addOverlayButton(document.querySelector(".S7dMR"));          // places map
    addOverlayButton(document.querySelector(".zMVLkf"));         // country map
  });
})();
