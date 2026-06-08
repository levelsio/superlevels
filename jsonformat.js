// ═══════════════════════════════════
//  superlevels: JSON Formatter
//  Auto-detects pure JSON pages and formats with syntax highlighting
// ═══════════════════════════════════
(() => {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    window.chrome = {
      storage: {
        local: {
          get: (keys, cb) => {
            const res = {};
            if (Array.isArray(keys)) {
              keys.forEach(k => { res[k] = true; });
            } else if (typeof keys === "string") {
              res[keys] = true;
            }
            cb(res);
          }
        }
      },
      runtime: {
        onMessage: {
          addListener: () => {}
        }
      }
    };
  }

  const STYLE_ID = "sl-jsonformat";

  function isJsonPage() {
    // Primary signal: content type
    const ct = document.contentType || "";
    if (ct.includes("json")) return true;

    // Fallback: single <pre> with valid JSON (APIs served as text/plain)
    const body = document.body;
    if (!body) return false;

    // Reject pages with real HTML structure
    const children = body.children;
    if (children.length !== 1) return false;
    if (children[0].tagName !== "PRE") return false;

    // Check if <pre> contains valid JSON
    const text = children[0].textContent.trim();
    if (!text) return false;
    // Quick check: must start with { or [
    if (text[0] !== "{" && text[0] !== "[") return false;
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  function syntaxHighlight(json) {
    // Escape HTML
    json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "sl-jf-number";
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "sl-jf-key" : "sl-jf-string";
        } else if (/true|false/.test(match)) {
          cls = "sl-jf-bool";
        } else if (/null/.test(match)) {
          cls = "sl-jf-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  function buildCollapsible(obj, indent) {
    indent = indent || 0;
    const pad = "  ".repeat(indent);
    const padInner = "  ".repeat(indent + 1);

    if (obj === null) return '<span class="sl-jf-null">null</span>';
    if (typeof obj !== "object") {
      // Primitive — let syntaxHighlight handle it via JSON.stringify
      return syntaxHighlight(JSON.stringify(obj));
    }

    const isArray = Array.isArray(obj);
    const open = isArray ? "[" : "{";
    const close = isArray ? "]" : "}";
    const entries = isArray ? obj : Object.keys(obj);

    if (entries.length === 0) {
      return isArray ? "[]" : "{}";
    }

    let html = `<span class="sl-jf-toggle" data-collapsed="false">${open}</span>`;
    html += `<span class="sl-jf-collapsible">`;
    html += "\n";

    entries.forEach((entry, i) => {
      const key = isArray ? null : entry;
      const val = isArray ? entry : obj[entry];
      const comma = i < entries.length - 1 ? "," : "";

      html += padInner;
      if (key !== null) {
        html += `<span class="sl-jf-key">"${escHtml(key)}"</span>: `;
      }
      html += buildCollapsible(val, indent + 1);
      html += comma + "\n";
    });

    html += `</span>`;
    html += `<span class="sl-jf-ellipsis" style="display:none">...</span>`;
    html += pad + close;

    return html;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function applyJsonFormat() {
    // Get raw JSON text
    let raw = "";
    if (document.body.children.length === 1 && document.body.children[0].tagName === "PRE") {
      raw = document.body.children[0].textContent;
    } else if (document.body.querySelector("pre")) {
      raw = document.body.querySelector("pre").textContent;
    } else {
      raw = document.body.textContent;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      return; // Can't parse — bail
    }

    // Inject styles
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body {
        margin: 0; padding: 0;
        background: #1a1a2e !important;
        color: #e0e0e0 !important;
        font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }
      .sl-jf-wrap {
        padding: 16px 20px;
        white-space: pre;
        overflow-x: auto;
        tab-size: 2;
      }
      .sl-jf-key { color: #e94560; }
      .sl-jf-string { color: #a8d8a8; }
      .sl-jf-number { color: #6ab0f3; }
      .sl-jf-bool { color: #f3d86a; }
      .sl-jf-null { color: #888; font-style: italic; }
      .sl-jf-toggle {
        cursor: pointer;
        user-select: none;
        position: relative;
      }
      .sl-jf-toggle:hover { text-decoration: underline; }
      .sl-jf-toggle::before {
        content: "▼";
        display: inline-block;
        width: 1em;
        margin-left: -1em;
        font-size: 10px;
        color: #666;
        transition: transform 0.15s;
      }
      .sl-jf-toggle[data-collapsed="true"]::before {
        transform: rotate(-90deg);
      }
      .sl-jf-ellipsis {
        color: #666;
        cursor: pointer;
      }
      .sl-jf-toolbar {
        position: fixed; top: 8px; right: 12px;
        display: flex; gap: 6px; z-index: 99999;
      }
      .sl-jf-toolbar button {
        padding: 5px 10px;
        background: #16213e;
        color: #aaa;
        border: 1px solid #2a2a4a;
        border-radius: 5px;
        font-size: 11px;
        font-family: -apple-system, sans-serif;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .sl-jf-toolbar button:hover {
        background: #1b2a4a;
        color: #fff;
      }
      .sl-jf-search {
        padding: 5px 10px;
        background: #16213e;
        color: #fff;
        border: 1px solid #2a2a4a;
        border-radius: 5px;
        font-size: 11px;
        font-family: -apple-system, sans-serif;
        outline: none;
        width: 120px;
        transition: width 0.2s, border-color 0.2s;
      }
      .sl-jf-search::placeholder {
        color: #666;
      }
      .sl-jf-search:hover {
        border-color: #3b4b7a;
      }
      .sl-jf-search:focus {
        width: 180px;
        border-color: #e94560;
      }
    `;

    // Replace body content
    document.head.appendChild(style);
    document.body.innerHTML = "";

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "sl-jf-toolbar";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search...";
    searchInput.className = "sl-jf-search";

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      // 1. Reset all previously highlighted targets
      const targets = document.querySelectorAll(".sl-jf-key, .sl-jf-string, .sl-jf-number, .sl-jf-bool, .sl-jf-null");
      targets.forEach((el) => {
        const orig = el.getAttribute("data-orig");
        if (orig !== null) {
          el.innerHTML = orig;
          el.removeAttribute("data-orig");
        }
      });

      if (!query) return;

      // 2. Perform search and highlight matches
      targets.forEach((el) => {
        const text = el.textContent;
        const lowerText = text.toLowerCase();
        if (lowerText.includes(query)) {
          // Cache original content if not already cached
          el.setAttribute("data-orig", el.innerHTML);

          // Escape HTML and highlight matches preserving case
          const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(${escapedQuery})`, 'gi');
          el.innerHTML = el.textContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(regex, `<mark style="background:#e94560; color:#fff; padding:0 2px; border-radius:2px;">$1</mark>`);

          // 3. Expand parent blocks
          let parent = el.parentElement;
          while (parent) {
            if (parent.classList.contains("sl-jf-collapsible")) {
              const toggle = parent.previousElementSibling;
              const ellipsis = parent.nextElementSibling;
              if (toggle && toggle.dataset.collapsed === "true") {
                toggle.dataset.collapsed = "false";
                parent.style.display = "";
                if (ellipsis) ellipsis.style.display = "none";
              }
            }
            parent = parent.parentElement;
          }
        }
      });
    });

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(JSON.stringify(parsed, null, 2)).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
      });
    });

    const rawBtn = document.createElement("button");
    rawBtn.textContent = "Raw";
    rawBtn.addEventListener("click", () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
      document.body.innerHTML = "";
      const pre = document.createElement("pre");
      pre.textContent = raw.trim();
      document.body.appendChild(pre);
    });

    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = "Collapse All";
    collapseBtn.addEventListener("click", () => {
      const all = document.querySelectorAll(".sl-jf-toggle");
      const shouldCollapse = collapseBtn.textContent === "Collapse All";
      all.forEach((t) => {
        t.dataset.collapsed = shouldCollapse ? "true" : "false";
        const block = t.nextElementSibling;
        const ellipsis = block.nextElementSibling;
        if (block) block.style.display = shouldCollapse ? "none" : "";
        if (ellipsis) ellipsis.style.display = shouldCollapse ? "inline" : "none";
      });
      collapseBtn.textContent = shouldCollapse ? "Expand All" : "Collapse All";
    });

    toolbar.appendChild(searchInput);
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(collapseBtn);
    toolbar.appendChild(rawBtn);
    document.body.appendChild(toolbar);

    // Formatted JSON
    const wrap = document.createElement("div");
    wrap.className = "sl-jf-wrap";
    wrap.innerHTML = buildCollapsible(parsed, 0);
    document.body.appendChild(wrap);

    // Toggle click handler (event delegation)
    wrap.addEventListener("click", (e) => {
      const toggle = e.target.closest(".sl-jf-toggle");
      if (!toggle) return;
      const collapsed = toggle.dataset.collapsed === "true";
      toggle.dataset.collapsed = collapsed ? "false" : "true";
      const block = toggle.nextElementSibling;
      const ellipsis = block.nextElementSibling;
      if (block) block.style.display = collapsed ? "" : "none";
      if (ellipsis) ellipsis.style.display = collapsed ? "none" : "inline";
    });
  }

  function removeFormat() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // Check storage and apply
  chrome.storage.local.get(["jsonformat_enabled"], (data) => {
    if (data.jsonformat_enabled !== false && isJsonPage()) {
      applyJsonFormat();
    }
  });

  // Listen for toggle from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "jsonformat_toggle") {
      if (msg.enabled && isJsonPage()) applyJsonFormat();
      else removeFormat();
    }
  });
})();
