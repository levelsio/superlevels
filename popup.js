// ═══════════════════════════════════
//  Mock Chrome extension APIs for local testing
// ═══════════════════════════════════
if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
  window.chrome = {
    storage: {
      local: {
        get: (keys, cb) => {
          const mockData = {};
          const getVal = (k) => {
            const val = localStorage.getItem(k);
            if (val === null) return undefined;
            try { return JSON.parse(val); } catch { return val; }
          };
          if (Array.isArray(keys)) {
            keys.forEach(k => { mockData[k] = getVal(k); });
          } else if (typeof keys === "object") {
            Object.keys(keys).forEach(k => {
              const v = getVal(k);
              mockData[k] = v !== undefined ? v : keys[k];
            });
          } else if (typeof keys === "string") {
            mockData[keys] = getVal(keys);
          }
          setTimeout(() => cb(mockData), 0);
        },
        set: (items, cb) => {
          Object.keys(items).forEach(k => {
            localStorage.setItem(k, JSON.stringify(items[k]));
          });
          if (cb) setTimeout(cb, 0);
        },
        remove: (keys, cb) => {
          if (Array.isArray(keys)) {
            keys.forEach(k => localStorage.removeItem(k));
          } else {
            localStorage.removeItem(keys);
          }
          if (cb) setTimeout(cb, 0);
        }
      }
    },
    tabs: {
      query: (queryInfo, cb) => {
        setTimeout(() => cb([{ id: 1, url: "https://x.com/home" }]), 0);
      },
      sendMessage: (tabId, message, cb) => {
        console.log("Mock sendMessage to tab", tabId, message);
        if (cb) setTimeout(() => cb({ ok: true }), 0);
        return Promise.resolve({ ok: true });
      },
      reload: (tabId) => {
        console.log("Mock reload tab", tabId);
      },
      create: (createProperties) => {
        console.log("Mock create tab", createProperties);
        window.open(createProperties.url, "_blank");
      }
    },
    cookies: {
      getAll: (details, cb) => {
        setTimeout(() => cb([
          { name: "mock_cookie_1", value: "hello_cookie_val", domain: "x.com", path: "/", secure: true, httpOnly: false },
          { name: "mock_cookie_2", value: "world_cookie_val", domain: "x.com", path: "/", secure: false, httpOnly: true }
        ]), 0);
      },
      set: (details, cb) => {
        console.log("Mock set cookie", details);
        if (cb) setTimeout(() => cb(details), 0);
      },
      remove: (details, cb) => {
        console.log("Mock remove cookie", details);
        if (cb) setTimeout(() => cb(details), 0);
      }
    },
    runtime: {
      sendMessage: (message, cb) => {
        console.log("Mock runtime sendMessage", message);
        let resp = {};
        if (message.type === "getRedirects") {
          resp = { chain: [{ url: "http://t.co/xyz", statusCode: 301, redirectUrl: "https://x.com/home" }], finalUrl: "https://x.com/home", finalStatus: 200 };
        }
        if (cb) setTimeout(() => cb(resp), 0);
        return Promise.resolve(resp);
      },
      lastError: null
    },
    contentSettings: {
      javascript: {
        get: (details, cb) => {
          setTimeout(() => cb({ setting: "allow" }), 0);
        },
        set: (details) => {
          console.log("Mock set contentSettings.javascript", details);
        }
      }
    }
  };
}

// ═══════════════════════════════════
//  Navigation & Customization Setup
// ═══════════════════════════════════
const FEATURES = [
  { id: "tabcleaner", label: "Tab Cleaner", icon: "🚮", navLabel: "Tabs", storageKey: "enabled", default: true, hasTab: true, description: "Automatically closes inactive tabs after a configurable timeout. Set excluded hosts to keep important tabs alive. View and re-open recently closed tabs." },
  { id: "cookies", label: "Cookie Editor", icon: "🍪", navLabel: "Cookies", storageKey: "feature_cookies_enabled", default: true, hasTab: true, description: "Full cookie manager for the current site. View, edit, add, and delete cookies. Export cookies as JSON." },
  { id: "redirects", label: "Redirect Tracer", icon: "🔀", navLabel: "Redirects", storageKey: "feature_redirects_enabled", default: true, hasTab: true, description: "See every redirect hop your browser took to reach the current page. Shows status codes with a visual chain." },
  { id: "darkmode", label: "Dark Mode", icon: "🌙", navLabel: "Dark", storageKey: "feature_darkmode_enabled", default: true, hasTab: true, description: "Instant dark mode for any website using CSS filter inversion. Adjustable brightness. Toggle per-site, globally, or follow system theme." },
  { id: "xdim", label: "𝕏 Dim Mode", icon: "𝕏", navLabel: "Dim", storageKey: "xdim_enabled", default: false, hasTab: true, description: "Applies a custom dim theme to X / Twitter. Choose a theme or set a custom hue for less eye strain." },
  { id: "xunhook", label: "𝕏 Unhook", icon: "𝕏", navLabel: "Unhook", storageKey: "xunhook_enabled", default: true, hasTab: true, description: "Removes X / Twitter distractions like sidebar panels (trends, news), keeping search and primary navigation clear." },
  { id: "jstoggle", label: "JS Toggle", icon: "⚡", navLabel: "JS", storageKey: "feature_jstoggle_enabled", default: true, hasTab: true, description: "Disable JavaScript for the current site. The page will reload when toggled." },
  { id: "nocookie", label: "GDPR Consent", icon: "🚫", navLabel: "GDPR", storageKey: "nocookie_enabled", default: true, hasTab: true, description: "Auto-dismisses cookie consent popups. Hides banners via CSS and auto-clicks accept buttons for common consent frameworks." },
  { id: "livecss", label: "CSS Editor", icon: "🎨", navLabel: "CSS", storageKey: "feature_livecss_enabled", default: true, hasTab: true, description: "Write custom CSS for any website, applied in real-time as you type. Saved per-domain." },
  { id: "unhook", label: "YouTube Unhook", icon: "📺", navLabel: "YT Unhook", storageKey: "unhook_enabled", default: true, hasTab: true, description: "Removes YouTube distractions: no homepage feed, no sidebar suggestions, no end screen overlays, no Shorts." },
  { id: "music", label: "Music Recognizer", icon: "🎵", navLabel: "Music", storageKey: "feature_music_enabled", default: true, hasTab: true, description: "Shazam-like music identification for any tab. Captures audio and identifies the song via ACRCloud." },
  { id: "pip", label: "Picture-in-Picture", icon: "🖼", navLabel: "PiP", storageKey: "feature_pip_enabled", default: true, hasTab: true, description: "Pops the largest video on the current tab into a floating PiP window. Click again to exit." },
  { id: "jsonformat", label: "JSON Formatter", icon: "{}", navLabel: "JSON", storageKey: "jsonformat_enabled", default: true, hasTab: true, description: "Auto-detects pure JSON response pages and formats them with syntax highlighting, collapsible sections, and a dark theme." },
  { id: "gmaps", label: "Google Maps Links", icon: "🗺", navLabel: "", storageKey: "feature_gmaps_enabled", default: true, hasTab: false, description: "Re-adds clickable Google Maps links and map preview cards to Google Search results." },
  { id: "viewimage", label: "View Image Button", icon: "🖼", navLabel: "", storageKey: "feature_viewimage_enabled", default: true, hasTab: false, description: "Adds a 'View Image' button back to Google Images, linking directly to the full-size original image." }
];

function loadTabDescriptions() {
  const mappings = {
    "nocookie-desc": "nocookie",
    "jsonformat-desc": "jsonformat",
    "unhook-desc": "unhook",
    "xunhook-desc": "xunhook",
    "xdim-desc": "xdim"
  };
  for (const [elementId, featureId] of Object.entries(mappings)) {
    const el = document.getElementById(elementId);
    if (el) {
      const feat = FEATURES.find(f => f.id === featureId);
      if (feat) {
        el.textContent = feat.description;
      }
    }
  }
}

function switchToPage(page) {
  document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const btn = document.querySelector(`.nav button[data-page="${page}"]`);
  if (!btn) return;
  btn.classList.add("active");
  document.getElementById("page-" + page).classList.add("active");
  if (page === "cookies") loadCookies();
  if (page === "redirects") loadRedirects();
  if (page === "darkmode") loadDarkMode();
  if (page === "xdim") loadXDim();
  if (page === "jstoggle") loadJsToggle();
  if (page === "nocookie") loadNoCookie();
  if (page === "livecss") loadLiveCSS();
  if (page === "unhook") loadUnhook();
  if (page === "xunhook") loadXUnhook();
  if (page === "jsonformat") loadJsonFormat();
  if (page === "music") { loadMusicHistory(); loadAcrFields(); }
  if (page === "settings") loadSettings();
  chrome.storage.local.set({ last_tab: page });
}

function updateNav() {
  const keys = FEATURES.map(f => f.storageKey).concat(["hidden_features", "last_tab", "feature_order"]);
  chrome.storage.local.get(keys, (data) => {
    const hiddenFeatures = data.hidden_features || [];
    const order = data.feature_order || FEATURES.map(f => f.id);
    let activePage = data.last_tab || "tabcleaner";
    
    const sortedFeatures = [...FEATURES].sort((a, b) => {
      let idxA = order.indexOf(a.id);
      let idxB = order.indexOf(b.id);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

    const navBar = document.getElementById("navBar");
    if (!navBar) return;

    let navHtml = "";
    let firstVisiblePage = "";
    let activePageIsVisible = false;

    sortedFeatures.forEach((f) => {
      if (!f.hasTab) return;
      const isEnabled = data[f.storageKey] !== undefined ? data[f.storageKey] !== false : f.default;
      const isHidden = hiddenFeatures.includes(f.id);
      
      if (isEnabled && !isHidden) {
        const activeClass = (f.id === activePage) ? "class=\"active\"" : "";
        navHtml += `<button ${activeClass} data-page="${f.id}">${f.icon} ${f.navLabel}</button>`;
        if (!firstVisiblePage) firstVisiblePage = f.id;
        if (f.id === activePage) activePageIsVisible = true;
      }
    });

    const settingsActive = (activePage === "settings") ? "class=\"active\"" : "";
    navHtml += `<button ${settingsActive} data-page="settings">⚙️ Settings</button>`;
    if (!firstVisiblePage) firstVisiblePage = "settings";
    if (activePage === "settings") activePageIsVisible = true;

    navBar.innerHTML = navHtml;

    navBar.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => switchToPage(btn.dataset.page));
    });

    if (!activePageIsVisible) {
      switchToPage(firstVisiblePage || "settings");
    } else {
      switchToPage(activePage);
    }
  });
}

// ═══════════════════════════════════
//  Tab Cleaner
// ═══════════════════════════════════
const timeoutEl = document.getElementById("timeout");
const hostInput = document.getElementById("hostInput");
const addBtn = document.getElementById("addBtn");
const listEl = document.getElementById("list");

chrome.storage.local.get(["timeoutMin", "exclusions"], (data) => {
  timeoutEl.value = data.timeoutMin || 5;
  renderExclusionList(data.exclusions || []);
});

timeoutEl.addEventListener("change", () => {
  const val = Math.max(1, Math.min(1440, parseInt(timeoutEl.value) || 5));
  timeoutEl.value = val;
  chrome.storage.local.set({ timeoutMin: val });
});

function addHost() {
  let host = hostInput.value.trim().toLowerCase();
  if (!host) return;
  host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  chrome.storage.local.get(["exclusions"], (data) => {
    const exclusions = data.exclusions || [];
    if (exclusions.includes(host)) { hostInput.value = ""; return; }
    exclusions.push(host);
    chrome.storage.local.set({ exclusions }, () => {
      hostInput.value = "";
      renderExclusionList(exclusions);
    });
  });
}

addBtn.addEventListener("click", addHost);
hostInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addHost(); });

function removeHost(host) {
  chrome.storage.local.get(["exclusions"], (data) => {
    const exclusions = (data.exclusions || []).filter((h) => h !== host);
    chrome.storage.local.set({ exclusions }, () => renderExclusionList(exclusions));
  });
}

function renderExclusionList(exclusions) {
  if (!exclusions.length) {
    listEl.innerHTML = '<div class="empty">No exclusions — all tabs can be closed</div>';
    return;
  }
  listEl.innerHTML = exclusions
    .map((h) => {
      const isExact = h.startsWith("exact:");
      const displayHost = isExact ? h.substring(6) : h;
      return `<div class="item" data-host="${escA(h)}">
        <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${escA(displayHost)}">${esc(displayHost)}</span>
        <label style="font-size: 10px; color: #888; display: flex; align-items: center; gap: 4px; margin-right: 8px; cursor: pointer; user-select: none;">
          <input type="checkbox" class="subdomain-toggle" ${isExact ? "" : "checked"} style="width: 12px; height: 12px; accent-color: #e94560; margin: 0; cursor: pointer;">
          subdomains
        </label>
        <button data-host="${escA(h)}" style="background: none; border: none; color: #e94560; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".subdomain-toggle").forEach((cb) => {
    cb.addEventListener("change", () => {
      const item = cb.closest(".item");
      const oldHost = item.dataset.host;
      const isChecked = cb.checked;
      const rawHost = oldHost.startsWith("exact:") ? oldHost.substring(6) : oldHost;
      const newHost = isChecked ? rawHost : "exact:" + rawHost;

      chrome.storage.local.get(["exclusions"], (data) => {
        let list = data.exclusions || [];
        list = list.map((ex) => (ex === oldHost ? newHost : ex));
        chrome.storage.local.set({ exclusions: list }, () => {
          renderExclusionList(list);
        });
      });
    });
  });

  listEl.querySelectorAll("button[data-host]").forEach((btn) => {
    btn.addEventListener("click", () => removeHost(btn.dataset.host));
  });
}

// ── Closed Tabs History ──
const closedSection = document.getElementById("closedSection");

function loadClosedTabs() {
  chrome.storage.local.get(["closed_tabs"], (data) => {
    const closed = data.closed_tabs || [];
    if (!closed.length) {
      closedSection.innerHTML = "";
      return;
    }
    closedSection.innerHTML = `
      <div class="closed-header">
        <h2>Recently Closed</h2>
        <button id="clearClosed">Clear</button>
      </div>
    ` + closed.map((t, i) => `
      <div class="closed-item" data-url="${escA(t.url)}" data-idx="${i}">
        ${t.favIconUrl ? `<img class="favicon" src="${escA(t.favIconUrl)}" onerror="this.style.display='none'">` : '<div class="favicon"></div>'}
        <span class="closed-title" title="${escA(t.url)}">${esc(t.title)}</span>
        <span class="closed-time">${timeAgo(t.time)}</span>
        <button class="reopen" title="Re-open">↗</button>
      </div>
    `).join("");

    document.getElementById("clearClosed").addEventListener("click", () => {
      chrome.storage.local.remove("closed_tabs", loadClosedTabs);
    });

    closedSection.querySelectorAll(".closed-item").forEach((item) => {
      item.addEventListener("click", () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

loadClosedTabs();

// ═══════════════════════════════════
//  Cookie Editor
// ═══════════════════════════════════
const cookieDomainEl = document.getElementById("cookieDomain");
const cookieCountEl = document.getElementById("cookieCount");
const cookieListEl = document.getElementById("cookieList");

let currentUrl = "";
let currentDomain = "";
let allCookies = [];

function filterAndRenderCookies() {
  const filterInput = document.getElementById("cookieFilter");
  const query = filterInput ? filterInput.value.trim().toLowerCase() : "";

  const btnClearCookieFilter = document.getElementById("btnClearCookieFilter");
  if (btnClearCookieFilter) {
    btnClearCookieFilter.style.display = filterInput && filterInput.value ? "block" : "none";
  }

  const filtered = query
    ? allCookies.filter((c) => c.name.toLowerCase().includes(query))
    : allCookies;

  cookieCountEl.textContent = filtered.length;

  const btnDeleteAll = document.getElementById("btnDeleteAll");
  const btnDeleteFiltered = document.getElementById("btnDeleteFiltered");
  if (btnDeleteAll && btnDeleteFiltered) {
    if (query) {
      btnDeleteAll.style.display = "none";
      btnDeleteFiltered.style.display = "";
    } else {
      btnDeleteAll.style.display = "";
      btnDeleteFiltered.style.display = "none";
    }
  }

  renderCookies(filtered);
}

async function loadCookies() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    cookieDomainEl.textContent = "No accessible page";
    cookieCountEl.textContent = "0";
    cookieListEl.innerHTML = '<div class="empty">Cannot read cookies from this page</div>';
    return;
  }
  currentUrl = tab.url;
  
  let tabDomain = "";
  try {
    tabDomain = new URL(tab.url).hostname;
  } catch {
    tabDomain = "";
  }

  // Clear filter input if domain has changed
  if (tabDomain !== currentDomain) {
    const filterInput = document.getElementById("cookieFilter");
    if (filterInput) filterInput.value = "";
  }
  currentDomain = tabDomain;
  cookieDomainEl.textContent = currentDomain;

  const cookies = await chrome.cookies.getAll({ url: tab.url });
  cookies.sort((a, b) => a.name.localeCompare(b.name));
  allCookies = cookies;
  
  filterAndRenderCookies();
}

function renderCookies(cookies) {
  if (!cookies.length) {
    cookieListEl.innerHTML = '<div class="empty">No cookies for this site</div>';
    return;
  }
  cookieListEl.innerHTML = cookies.map((c, i) => `
    <div class="cookie-item" data-idx="${i}">
      <div class="cookie-row">
        <span class="cookie-chevron">&#9660;</span>
        <span class="cookie-name">${esc(c.name)}</span>
        <button class="cookie-del" data-delidx="${i}" title="Delete">&times;</button>
      </div>
      <div class="cookie-details">
        <div class="cookie-field">
          <label>Name</label>
          <input type="text" value="${escA(c.name)}" data-field="name" data-i="${i}">
        </div>
        <div class="cookie-field">
          <label>Value</label>
          <textarea data-field="value" data-i="${i}">${esc(c.value)}</textarea>
        </div>
        <div class="advanced-toggle" data-adv="${i}">Show Advanced</div>
        <div class="advanced-fields" data-advf="${i}">
          <div class="cookie-field">
            <label>Domain</label>
            <input type="text" value="${escA(c.domain)}" data-field="domain" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Path</label>
            <input type="text" value="${escA(c.path)}" data-field="path" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>SameSite</label>
            <input type="text" value="${escA(c.sameSite || "unspecified")}" data-field="sameSite" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Secure: ${c.secure ? "Yes" : "No"} &nbsp;|&nbsp; HttpOnly: ${c.httpOnly ? "Yes" : "No"}</label>
          </div>
        </div>
        <div class="cookie-actions">
          <button class="btn-save" data-saveidx="${i}">&#128190; Save</button>
          <button class="btn-del2" data-delidx="${i}">&#128465; Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  // Expand / collapse
  cookieListEl.querySelectorAll(".cookie-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".cookie-del")) return;
      row.closest(".cookie-item").classList.toggle("expanded");
    });
  });

  // Show Advanced
  cookieListEl.querySelectorAll(".advanced-toggle").forEach((t) => {
    t.addEventListener("click", () => {
      const fields = cookieListEl.querySelector(`.advanced-fields[data-advf="${t.dataset.adv}"]`);
      fields.classList.toggle("show");
      t.textContent = fields.classList.contains("show") ? "Hide Advanced" : "Show Advanced";
    });
  });

  // Delete buttons
  cookieListEl.querySelectorAll("[data-delidx]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCookie(allCookies[parseInt(btn.dataset.delidx)]);
    });
  });

  // Save buttons
  cookieListEl.querySelectorAll("[data-saveidx]").forEach((btn) => {
    btn.addEventListener("click", () => saveCookie(parseInt(btn.dataset.saveidx)));
  });
}

async function deleteCookie(cookie) {
  const protocol = cookie.secure ? "https" : "http";
  const url = `${protocol}://${cookie.domain.replace(/^\./, "")}${cookie.path}`;
  await chrome.cookies.remove({ url, name: cookie.name });
  loadCookies();
}

async function saveCookie(idx) {
  const original = allCookies[idx];
  const item = cookieListEl.querySelector(`.cookie-item[data-idx="${idx}"]`);

  const nameEl = item.querySelector('[data-field="name"]');
  const valueEl = item.querySelector('[data-field="value"]');
  const domainEl = item.querySelector('[data-field="domain"]');
  const pathEl = item.querySelector('[data-field="path"]');
  const sameSiteEl = item.querySelector('[data-field="sameSite"]');

  // Remove old cookie first
  const protocol = original.secure ? "https" : "http";
  const oldUrl = `${protocol}://${original.domain.replace(/^\./, "")}${original.path}`;
  await chrome.cookies.remove({ url: oldUrl, name: original.name });

  const domain = domainEl ? domainEl.value : original.domain;
  const path = pathEl ? pathEl.value : original.path;
  const newUrl = `${protocol}://${domain.replace(/^\./, "")}${path}`;

  const details = {
    url: newUrl,
    name: nameEl.value,
    value: valueEl.value,
    path: path,
    secure: original.secure,
    httpOnly: original.httpOnly,
    sameSite: sameSiteEl ? sameSiteEl.value : original.sameSite || "unspecified",
  };
  if (!original.hostOnly) details.domain = domain;
  if (original.expirationDate) details.expirationDate = original.expirationDate;

  await chrome.cookies.set(details);
  loadCookies();
}

// Delete All
document.getElementById("btnDeleteAll").addEventListener("click", async () => {
  if (!allCookies.length) return;
  for (const c of allCookies) {
    const protocol = c.secure ? "https" : "http";
    const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;
    await chrome.cookies.remove({ url, name: c.name });
  }
  loadCookies();
});

// Delete Filtered
const btnDeleteFiltered = document.getElementById("btnDeleteFiltered");
if (btnDeleteFiltered) {
  btnDeleteFiltered.addEventListener("click", async () => {
    const filterInput = document.getElementById("cookieFilter");
    const query = filterInput ? filterInput.value.trim().toLowerCase() : "";
    if (!query) return;

    const filtered = allCookies.filter((c) => c.name.toLowerCase().includes(query));
    if (!filtered.length) return;

    for (const c of filtered) {
      const protocol = c.secure ? "https" : "http";
      const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;
      await chrome.cookies.remove({ url, name: c.name });
    }

    if (filterInput) filterInput.value = "";
    loadCookies();
  });
}

// Refresh
document.getElementById("btnRefresh").addEventListener("click", () => loadCookies());

// Export
document.getElementById("btnExport").addEventListener("click", () => {
  if (!allCookies.length) return;
  const data = JSON.stringify(allCookies, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cookies-${currentDomain}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Filter Cookies on input
const cookieFilterInput = document.getElementById("cookieFilter");
const btnClearCookieFilter = document.getElementById("btnClearCookieFilter");
if (cookieFilterInput) {
  cookieFilterInput.addEventListener("input", filterAndRenderCookies);
}
if (btnClearCookieFilter && cookieFilterInput) {
  btnClearCookieFilter.addEventListener("click", () => {
    cookieFilterInput.value = "";
    filterAndRenderCookies();
    cookieFilterInput.focus();
  });
}

// Add Cookie Modal
const addModal = document.getElementById("addModal");
document.getElementById("btnAdd").addEventListener("click", () => {
  document.getElementById("newDomain").value = currentDomain ? "." + currentDomain : "";
  document.getElementById("newPath").value = "/";
  document.getElementById("newName").value = "";
  document.getElementById("newValue").value = "";
  addModal.classList.add("show");
});
document.getElementById("modalCancel").addEventListener("click", () => {
  addModal.classList.remove("show");
});
addModal.addEventListener("click", (e) => {
  if (e.target === addModal) addModal.classList.remove("show");
});
document.getElementById("modalSave").addEventListener("click", async () => {
  const name = document.getElementById("newName").value.trim();
  if (!name) return;
  const domain = document.getElementById("newDomain").value.trim();
  const path = document.getElementById("newPath").value.trim() || "/";
  const url = `https://${domain.replace(/^\./, "")}${path}`;
  await chrome.cookies.set({
    url,
    name,
    value: document.getElementById("newValue").value,
    domain,
    path,
  });
  addModal.classList.remove("show");
  loadCookies();
});

// ═══════════════════════════════════
//  Redirect Tracer
// ═══════════════════════════════════
const redirectChainEl = document.getElementById("redirectChain");
let lastRedirectText = "";

async function loadRedirects() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    redirectChainEl.innerHTML = '<div class="redirect-empty"><div class="big-icon">🔀</div><p>No active tab</p></div>';
    return;
  }

  const data = await chrome.runtime.sendMessage({ type: "getRedirects", tabId: tab.id });
  const chain = data.chain || [];
  const finalUrl = data.finalUrl || tab.url;
  const finalStatus = data.finalStatus || 200;

  if (!chain.length) {
    // No redirects — just show the final URL
    redirectChainEl.innerHTML = renderStep(finalUrl, finalStatus, true, false);
    lastRedirectText = `${finalUrl}\n${finalStatus}: Final destination`;
    return;
  }

  let html = "";
  let text = "";
  chain.forEach((hop, i) => {
    const label = getRedirectLabel(hop.statusCode);
    html += renderStep(hop.url, hop.statusCode, false, true);
    text += `${hop.url}\n${hop.statusCode}: ${label} to ${hop.redirectUrl}\n\n`;
  });
  // Final destination
  html += renderStep(finalUrl, finalStatus, true, false);
  text += `${finalUrl}\n${finalStatus}: Final destination`;

  redirectChainEl.innerHTML = html;
  lastRedirectText = text;
}

function renderStep(url, statusCode, isFinal, hasConnector) {
  const iconClass = isFinal ? (statusCode >= 400 ? "error" : "final") : "redirect";
  const codeClass = statusCode >= 500 ? "code-5xx" : statusCode >= 400 ? "code-4xx" : `code-${statusCode}`;
  const label = isFinal ? "Final destination" : getRedirectLabel(statusCode);
  const arrow = isFinal
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="#6af38a" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="#6ab0f3" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';

  return `
    <div class="redirect-step">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="step-icon ${iconClass}">${arrow}</div>
        ${hasConnector ? '<div class="step-connector"></div>' : ''}
      </div>
      <div class="step-content">
        <div class="step-url">${esc(url)}</div>
        <div class="step-status"><span class="code ${codeClass}">${statusCode}</span> ${esc(label)}</div>
      </div>
    </div>
  `;
}

function getRedirectLabel(code) {
  const labels = {
    301: "Permanent redirect",
    302: "Temporary redirect (Found)",
    303: "See Other",
    307: "Temporary redirect",
    308: "Permanent redirect",
  };
  return labels[code] || `Redirect (${code})`;
}

document.getElementById("btnRedirectRefresh").addEventListener("click", () => loadRedirects());

document.getElementById("btnRedirectCopy").addEventListener("click", async () => {
  if (!lastRedirectText) return;
  await navigator.clipboard.writeText(lastRedirectText);
  const btn = document.getElementById("btnRedirectCopy");
  const orig = btn.querySelector("span").textContent;
  btn.querySelector("span").textContent = "Copied!";
  setTimeout(() => { btn.querySelector("span").textContent = orig; }, 1500);
});

// ═══════════════════════════════════
//  Dark Mode
// ═══════════════════════════════════
const darkHostEl = document.getElementById("darkHost");
const darkBrightness = document.getElementById("darkBrightness");
const darkBrightnessVal = document.getElementById("darkBrightnessVal");
const scopeSite = document.getElementById("scopeSite");
const scopeGlobal = document.getElementById("scopeGlobal");

let darkHost = "";
let darkScope = "site"; // "site" or "global"

async function loadDarkMode() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { darkHost = new URL(tab.url).hostname; } catch { darkHost = ""; }
  darkHostEl.textContent = darkHost ? `Current site: ${darkHost}` : "";

  const siteKey = "darkmode_" + darkHost;
  const data = await chrome.storage.local.get([siteKey, "darkmode_global", "darkmode_brightness"]);

  const brightness = data.darkmode_brightness || 100;
  darkBrightness.value = brightness;
  darkBrightnessVal.textContent = brightness + "%";

  const siteState = data[siteKey];
  const globalState = data.darkmode_global !== undefined ? data.darkmode_global : "off";
  const rawMode = darkScope === "global" ? globalState : (siteState !== undefined ? siteState : globalState);

  let mode = "off";
  if (rawMode === true || rawMode === "on") mode = "on";
  else if (rawMode === false || rawMode === "off") mode = "off";
  else if (rawMode === "system") mode = "system";

  const container = document.getElementById("darkPillSelector");
  if (container) {
    const btns = Array.from(container.querySelectorAll(".pill-btn"));
    const activeBtn = container.querySelector(`.pill-btn[data-mode="${mode}"]`);
    const glider = container.querySelector(".pill-glider");
    
    btns.forEach(b => b.classList.remove("active"));
    if (activeBtn) {
      activeBtn.classList.add("active");
      const idx = btns.indexOf(activeBtn);
      if (glider) {
        glider.style.transform = `translateX(${idx * 100}%)`;
      }
    }
  }
}

async function setDarkMode(mode) {
  const container = document.getElementById("darkPillSelector");
  if (container) {
    const btns = Array.from(container.querySelectorAll(".pill-btn"));
    const activeBtn = container.querySelector(`.pill-btn[data-mode="${mode}"]`);
    const glider = container.querySelector(".pill-glider");
    btns.forEach(b => b.classList.remove("active"));
    if (activeBtn) {
      activeBtn.classList.add("active");
      const idx = btns.indexOf(activeBtn);
      if (glider) {
        glider.style.transform = `translateX(${idx * 100}%)`;
      }
    }
  }

  if (darkScope === "global") {
    await chrome.storage.local.set({ darkmode_global: mode });
  } else {
    const siteKey = "darkmode_" + darkHost;
    await chrome.storage.local.set({ [siteKey]: mode });
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
  }
}

const darkPillSelector = document.getElementById("darkPillSelector");
if (darkPillSelector) {
  darkPillSelector.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setDarkMode(btn.dataset.mode);
    });
  });
}

darkBrightness.addEventListener("input", () => {
  darkBrightnessVal.textContent = darkBrightness.value + "%";
});
darkBrightness.addEventListener("change", async () => {
  const brightness = parseInt(darkBrightness.value);
  await chrome.storage.local.set({ darkmode_brightness: brightness });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
  }
});

scopeSite.addEventListener("click", () => {
  darkScope = "site";
  scopeSite.classList.add("active");
  scopeGlobal.classList.remove("active");
  loadDarkMode();
});
scopeGlobal.addEventListener("click", () => {
  darkScope = "global";
  scopeGlobal.classList.add("active");
  scopeSite.classList.remove("active");
  loadDarkMode();
});

// ═══════════════════════════════════
//  X Dim Mode
// ═══════════════════════════════════
const xdimPreview = document.getElementById("xdimPreview");
const xdimHueSlider = document.getElementById("xdimHueSlider");
const xdimHueVal = document.getElementById("xdimHueVal");
const xdimCustomHueSection = document.getElementById("xdimCustomHueSection");
const xdimDots = document.querySelectorAll(".xdim-dot");

const XDIM_THEMES = {
  dim:   { hue: 210, sat: 34 },
  slate: { hue: 210, sat: 8  },
  jade:  { hue: 150, sat: 34 },
  plum:  { hue: 270, sat: 34 },
  dusk:  { hue: 330, sat: 34 },
  ember: { hue: 25,  sat: 34 },
};

let xdimTheme = "dim";
let xdimCustomHue = 210;

async function loadXDim() {
  const data = await chrome.storage.local.get(["xdim_theme", "xdim_customHue"]);
  xdimTheme = data.xdim_theme || "dim";
  xdimCustomHue = data.xdim_customHue || 210;

  xdimHueSlider.value = xdimCustomHue;
  xdimHueVal.textContent = xdimCustomHue + "°";

  updateXDimThemeDots();
  updateXDimPreview();
}

function updateXDimThemeDots() {
  xdimDots.forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.theme === xdimTheme);
  });
  xdimCustomHueSection.classList.toggle("show", xdimTheme === "custom");
}

function getXDimHueSat() {
  if (xdimTheme === "custom") return { hue: xdimCustomHue, sat: 34 };
  return XDIM_THEMES[xdimTheme] || XDIM_THEMES.dim;
}

function updateXDimPreview() {
  const { hue: h, sat: s } = getXDimHueSat();
  const bSat = Math.round(s * 0.47);
  const bar = xdimPreview.querySelector(".xdim-preview-bar");
  const tweet = xdimPreview.querySelector(".xdim-preview-tweet");
  bar.style.background = `hsl(${h}, ${s}%, 16%)`;
  bar.style.color = `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`;
  tweet.style.background = `hsl(${h}, ${s}%, 13%)`;
  tweet.style.color = `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`;
  tweet.style.borderColor = `hsl(${h}, ${bSat}%, 26%)`;
}

xdimDots.forEach((dot) => {
  dot.addEventListener("click", async () => {
    xdimTheme = dot.dataset.theme;
    updateXDimThemeDots();
    updateXDimPreview();
    await chrome.storage.local.set({ xdim_theme: xdimTheme });
  });
});

xdimHueSlider.addEventListener("input", () => {
  xdimCustomHue = parseInt(xdimHueSlider.value);
  xdimHueVal.textContent = xdimCustomHue + "°";
  updateXDimPreview();
});
xdimHueSlider.addEventListener("change", async () => {
  xdimCustomHue = parseInt(xdimHueSlider.value);
  await chrome.storage.local.set({ xdim_customHue: xdimCustomHue });
});

let nocookieHost = "";

async function loadNoCookie() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const container = document.getElementById("nocookieCurrentSite");
  const hostLabel = document.getElementById("nocookieHost");
  const btnExclude = document.getElementById("btnNocookieExclude");
  const listHeader = document.getElementById("nocookieExclusionsHeader");
  const listEl = document.getElementById("nocookieExclusionsList");

  if (!container || !hostLabel || !btnExclude || !listHeader || !listEl) return;

  if (tab && tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
    try {
      nocookieHost = new URL(tab.url).hostname;
    } catch {
      nocookieHost = "";
    }
  } else {
    nocookieHost = "";
  }

  if (nocookieHost) {
    container.style.display = "flex";
    hostLabel.textContent = nocookieHost;
  } else {
    container.style.display = "none";
  }

  chrome.storage.local.get(["nocookie_exclusions"], (data) => {
    const exclusions = data.nocookie_exclusions || [];

    if (nocookieHost) {
      const isExcluded = exclusions.includes(nocookieHost);
      btnExclude.textContent = isExcluded ? "Re-enable Consent Dismissal" : "Exclude This Site";
      if (isExcluded) {
        btnExclude.style.borderColor = "#4caf50";
        btnExclude.style.color = "#4caf50";
      } else {
        btnExclude.style.borderColor = "#e94560";
        btnExclude.style.color = "#e94560";
      }
    }

    if (exclusions.length > 0) {
      listHeader.style.display = "block";
      listEl.innerHTML = exclusions
        .map((h) => `<div class="item"><span>${esc(h)}</span><button data-host="${escA(h)}">&times;</button></div>`)
        .join("");

      listEl.querySelectorAll("button[data-host]").forEach((btn) => {
        btn.addEventListener("click", () => removeNocookieExclusion(btn.dataset.host));
      });
    } else {
      listHeader.style.display = "none";
      listEl.innerHTML = "";
    }
  });
}

async function toggleNocookieExclusion() {
  if (!nocookieHost) return;
  chrome.storage.local.get(["nocookie_exclusions"], async (data) => {
    let exclusions = data.nocookie_exclusions || [];
    if (exclusions.includes(nocookieHost)) {
      exclusions = exclusions.filter((h) => h !== nocookieHost);
    } else {
      exclusions.push(nocookieHost);
    }
    await chrome.storage.local.set({ nocookie_exclusions: exclusions });
    
    // Notify active tab content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: "nocookie_exclusions_updated" }).catch(() => {});
      chrome.tabs.reload(tab.id);
    }
    
    loadNoCookie();
  });
}

function removeNocookieExclusion(host) {
  chrome.storage.local.get(["nocookie_exclusions"], async (data) => {
    const exclusions = (data.nocookie_exclusions || []).filter((h) => h !== host);
    await chrome.storage.local.set({ nocookie_exclusions: exclusions });
    
    // Notify active tab content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: "nocookie_exclusions_updated" }).catch(() => {});
      try {
        const tabHost = new URL(tab.url).hostname;
        if (tabHost === host) {
          chrome.tabs.reload(tab.id);
        }
      } catch {}
    }
    
    loadNoCookie();
  });
}

// Bind button listener
const btnNocookieExclude = document.getElementById("btnNocookieExclude");
if (btnNocookieExclude) {
  btnNocookieExclude.addEventListener("click", toggleNocookieExclusion);
}

// ═══════════════════════════════════
//  Live CSS Editor
// ═══════════════════════════════════
const livecssHostEl = document.getElementById("livecssHost");
const livecssEditor = document.getElementById("livecssEditor");
const livecssSave = document.getElementById("livecssSave");
const livecssClear = document.getElementById("livecssClear");

let livecssHost = "";

async function loadLiveCSS() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { livecssHost = new URL(tab.url).hostname; } catch { livecssHost = ""; }
  livecssHostEl.textContent = livecssHost ? `Editing CSS for: ${livecssHost}` : "No accessible page";

  const key = "livecss_" + livecssHost;
  const data = await chrome.storage.local.get([key]);
  livecssEditor.value = data[key] || "";
}

// Live preview as user types
livecssEditor.addEventListener("input", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: livecssEditor.value }).catch(() => {});
  }
});

// Allow Tab key to insert spaces in textarea
livecssEditor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = livecssEditor.selectionStart;
    const end = livecssEditor.selectionEnd;
    livecssEditor.value = livecssEditor.value.substring(0, start) + "  " + livecssEditor.value.substring(end);
    livecssEditor.selectionStart = livecssEditor.selectionEnd = start + 2;
    livecssEditor.dispatchEvent(new Event("input"));
  }
});

livecssSave.addEventListener("click", async () => {
  const key = "livecss_" + livecssHost;
  await chrome.storage.local.set({ [key]: livecssEditor.value });
  livecssSave.textContent = "Saved!";
  setTimeout(() => { livecssSave.textContent = "Save"; }, 1500);
});

livecssClear.addEventListener("click", async () => {
  livecssEditor.value = "";
  const key = "livecss_" + livecssHost;
  await chrome.storage.local.remove(key);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: "" }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  YouTube Unhook
// ═══════════════════════════════════
function loadUnhook() {}

// ═══════════════════════════════════
//  X Unhook
// ═══════════════════════════════════
function loadXUnhook() {}

// ═══════════════════════════════════
//  JavaScript Toggle
// ═══════════════════════════════════
const jsToggle = document.getElementById("jsToggle");
const jsStatus = document.getElementById("jsStatus");
const jsIndicator = document.getElementById("jsIndicator");
const jsHostLabel = document.getElementById("jsHostLabel");

let jsHost = "";

async function loadJsToggle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { jsHost = new URL(tab.url).hostname; } catch { jsHost = ""; }
  jsHostLabel.textContent = jsHost || "No accessible page";

  if (!jsHost) return;

  if (!chrome.contentSettings || !chrome.contentSettings.javascript) return;
  const pattern = `https://${jsHost}/*`;
  chrome.contentSettings.javascript.get({ primaryUrl: pattern }, (details) => {
    const enabled = details.setting === "allow";
    jsToggle.checked = enabled;
    updateJsUI(enabled);
  });
}

function updateJsUI(enabled) {
  jsStatus.textContent = enabled ? "ENABLED" : "DISABLED";
  jsStatus.className = "status " + (enabled ? "on" : "off");
  jsIndicator.className = "indicator " + (enabled ? "on" : "off");
}

jsToggle.addEventListener("change", async () => {
  const enabled = jsToggle.checked;
  updateJsUI(enabled);

  if (!chrome.contentSettings || !chrome.contentSettings.javascript) return;
  const pattern = `https://${jsHost}/*`;
  chrome.contentSettings.javascript.set({
    primaryPattern: pattern,
    setting: enabled ? "allow" : "block",
  });
  // Also set for http
  chrome.contentSettings.javascript.set({
    primaryPattern: `http://${jsHost}/*`,
    setting: enabled ? "allow" : "block",
  });

  // Reload the tab so the change takes effect
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) chrome.tabs.reload(tab.id);
});

// ═══════════════════════════════════
//  Music Recognizer (ACRCloud)
// ═══════════════════════════════════
// ACRCloud credentials — loaded from storage so they're not hardcoded in source
let ACR_HOST = "";
let ACR_KEY = "";
let ACR_SECRET = "";

// Load saved creds (set defaults on first run)
chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
  ACR_HOST = data.acr_host || "identify-eu-west-1.acrcloud.com";
  ACR_KEY = data.acr_key || "";
  ACR_SECRET = data.acr_secret || "";
});

const listenBtn = document.getElementById("listenBtn");
const listenTimer = document.getElementById("listenTimer");
const listenLabel = document.getElementById("listenLabel");
const musicResult = document.getElementById("musicResult");
const musicHistoryEl = document.getElementById("musicHistory");
let isRecording = false;

listenBtn.addEventListener("click", () => {
  if (isRecording) return;
  startListening();
});

async function startListening() {
  if (!ACR_KEY || !ACR_SECRET) {
    musicResult.innerHTML = `<div class="music-error">ACRCloud credentials not set. <a href="https://www.acrcloud.com/sign-up/" target="_blank" style="color:#6a9fd8;">Sign up free</a> and add them below.</div>`;
    showAcrConfig();
    return;
  }
  isRecording = true;
  listenBtn.classList.add("recording");
  listenBtn.closest(".music-center").classList.add("active");
  listenLabel.textContent = "Listening...";
  musicResult.innerHTML = "";

  let seconds = 10;
  listenTimer.textContent = seconds + "s";
  const interval = setInterval(() => {
    seconds--;
    listenTimer.textContent = seconds + "s";
    if (seconds <= 0) clearInterval(interval);
  }, 1000);

  try {
    const stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (s) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!s) return reject(new Error("No audio stream"));
        resolve(s);
      });
    });

    // Pipe audio back to speakers so user still hears it
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(audioCtx.destination);

    // Record 5 seconds
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        source.disconnect();
        audioCtx.close();
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: "audio/webm" }));
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 10000);
    });

    clearInterval(interval);
    listenTimer.textContent = "";
    listenLabel.textContent = "Identifying...";

    const result = await identifyWithACR(blob);
    showResult(result);
  } catch (err) {
    clearInterval(interval);
    musicResult.innerHTML = `<div class="music-error">${esc(err.message)}</div>`;
    showAcrConfig();
  } finally {
    isRecording = false;
    listenBtn.classList.remove("recording");
    listenBtn.closest(".music-center").classList.remove("active");
    listenTimer.textContent = "";
    listenLabel.textContent = "Tap to listen";
  }
}

async function hmacSha1(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function identifyWithACR(audioBlob) {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `POST\n/v1/identify\n${ACR_KEY}\naudio\n1\n${timestamp}`;
  const signature = await hmacSha1(ACR_SECRET, stringToSign);

  const arrayBuf = await audioBlob.arrayBuffer();
  const form = new FormData();
  form.append("access_key", ACR_KEY);
  form.append("data_type", "audio");
  form.append("signature_version", "1");
  form.append("signature", signature);
  form.append("timestamp", timestamp.toString());
  form.append("sample_bytes", arrayBuf.byteLength.toString());
  form.append("sample", audioBlob, "sample.webm");

  const resp = await fetch(`https://${ACR_HOST}/v1/identify`, { method: "POST", body: form });
  const data = await resp.json();

  if (data.status && data.status.code === 0 && data.metadata) {
    const music = data.metadata.music;
    const humming = data.metadata.humming;
    if (music && music.length > 0) return music[0];
    if (humming && humming.length > 0) return humming[0];
    throw new Error("Song recognized but no match found. Try a clearer part of the track.");
  } else if (data.status && data.status.code === 0) {
    throw new Error("No match found. Try during a clearer part of the song (e.g. chorus).");
  } else if (data.status && data.status.code === 1001) {
    throw new Error("No music detected. Make sure audio is playing in the tab.");
  } else {
    throw new Error(data.status ? data.status.msg : "Unknown error");
  }
}

function showResult(song) {
  const title = song.title || "Unknown";
  const artist = (song.artists || []).map((a) => a.name).join(", ") || "Unknown";
  const album = song.album ? song.album.name : "";

  const ytQuery = encodeURIComponent(`${title} ${artist}`);
  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

  musicResult.innerHTML = `
    <a class="song-card" href="${ytUrl}" target="_blank" style="text-decoration:none;color:inherit;cursor:pointer;">
      <div class="art">🎵</div>
      <div class="info">
        <div class="title">${esc(title)}</div>
        <div class="artist">${esc(artist)}</div>
        ${album ? `<div class="album">${esc(album)}</div>` : ""}
      </div>
      <div style="color:#e94560;font-size:18px;flex-shrink:0;">▶</div>
    </a>
  `;

  // Save to history
  chrome.storage.local.get(["music_history"], (data) => {
    const history = data.music_history || [];
    history.unshift({ title, artist, album, time: Date.now() });
    if (history.length > 20) history.length = 20;
    chrome.storage.local.set({ music_history: history }, loadMusicHistory);
  });
}

// ACR config save/load
document.getElementById("acrSaveBtn").addEventListener("click", () => {
  const host = document.getElementById("acrHost").value.trim();
  const key = document.getElementById("acrKey").value.trim();
  const secret = document.getElementById("acrSecret").value.trim();
  ACR_HOST = host || ACR_HOST;
  ACR_KEY = key;
  ACR_SECRET = secret;
  chrome.storage.local.set({ acr_host: ACR_HOST, acr_key: ACR_KEY, acr_secret: ACR_SECRET });
  document.getElementById("acrSaveBtn").textContent = "Saved!";
  setTimeout(() => { document.getElementById("acrSaveBtn").textContent = "Save"; }, 1500);
});

function showAcrConfig() {
  document.getElementById("acrConfig").style.display = "";
}

document.getElementById("acrSettingsBtn").addEventListener("click", () => {
  const cfg = document.getElementById("acrConfig");
  if (cfg.style.display === "none") {
    cfg.style.display = "";
    // Load fields without the auto-hide logic
    chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
      document.getElementById("acrHost").value = data.acr_host || "identify-eu-west-1.acrcloud.com";
      document.getElementById("acrKey").value = data.acr_key || "";
      document.getElementById("acrSecret").value = data.acr_secret || "";
    });
  } else {
    cfg.style.display = "none";
  }
});

// Load ACR fields when music tab opens
function loadAcrFields() {
  chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
    document.getElementById("acrHost").value = data.acr_host || "identify-eu-west-1.acrcloud.com";
    document.getElementById("acrKey").value = data.acr_key || "";
    document.getElementById("acrSecret").value = data.acr_secret || "";
    // Only show config if creds are missing
    if (!data.acr_key || !data.acr_secret) showAcrConfig();
    else document.getElementById("acrConfig").style.display = "none";
  });
}

function loadMusicHistory() {
  chrome.storage.local.get(["music_history"], (data) => {
    const history = data.music_history || [];
    if (!history.length) {
      musicHistoryEl.innerHTML = "";
      return;
    }
    musicHistoryEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><h2>Recent</h2><button id="clearHistory" style="background:none;border:none;color:#e94560;font-size:11px;cursor:pointer;">Clear</button></div>` + history.map((h) => {
      const q = encodeURIComponent(`${h.title} ${h.artist}`);
      return `<a class="history-item" href="https://www.youtube.com/results?search_query=${q}" target="_blank" style="text-decoration:none;color:inherit;cursor:pointer;">
        <span class="h-title">${esc(h.title)}</span>
        <span class="h-artist">${esc(h.artist)}</span>
        <span style="color:#e94560;font-size:12px;flex-shrink:0;">▶</span>
      </a>`;
    }).join("");
    document.getElementById("clearHistory").addEventListener("click", () => {
      chrome.storage.local.remove("music_history", loadMusicHistory);
    });
  });
}

// ═══════════════════════════════════
//  Picture-in-Picture
// ═══════════════════════════════════
const pipBtn = document.getElementById("pipBtn");
const pipLabel = document.getElementById("pipLabel");
const pipStatus = document.getElementById("pipStatus");

pipBtn.addEventListener("click", enterPiP);

async function enterPiP() {
  pipStatus.textContent = "";
  pipStatus.className = "pip-status";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    pipStatus.textContent = "No active tab";
    pipStatus.className = "pip-status err";
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({ type: "pip", tabId: tab.id });
    if (!result) {
      pipStatus.textContent = "Could not access page";
      pipStatus.className = "pip-status err";
    } else if (result.error) {
      pipStatus.textContent = result.error;
      pipStatus.className = "pip-status err";
    } else if (result.action === "entered") {
      pipStatus.textContent = "Video in Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.add("active");
    } else if (result.action === "exited") {
      pipStatus.textContent = "Exited Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.remove("active");
    }
  } catch (err) {
    pipStatus.textContent = err.message;
    pipStatus.className = "pip-status err";
  }
}

// ═══════════════════════════════════
//  JSON Formatter
// ═══════════════════════════════════
function loadJsonFormat() {}

// ═══════════════════════════════════
//  Settings Panel Customization
// ═══════════════════════════════════
let showHidden = false;

function renderFeatureRow(f, isEnabled, isHidden, isVisible) {
  const toggleId = `setting-toggle-${f.id}`;
  const hiddenClass = isHidden ? "hidden-feature" : "";
  const displayStyle = isVisible ? "" : "style=\"display: none !important;\"";
  const hideBtnIcon = isHidden
    ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const hideTitle = isHidden ? "Show feature in navigation" : "Hide feature from navigation";
  
  const dragHandleIcon = `
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="3" cy="3" r="1" fill="currentColor"/>
      <circle cx="3" cy="9" r="1" fill="currentColor"/>
      <circle cx="3" cy="15" r="1" fill="currentColor"/>
      <circle cx="9" cy="3" r="1" fill="currentColor"/>
      <circle cx="9" cy="9" r="1" fill="currentColor"/>
      <circle cx="9" cy="15" r="1" fill="currentColor"/>
    </svg>
  `;

  return `
    <div class="setting-item ${hiddenClass}" data-feature-id="${f.id}" draggable="true" ${displayStyle}>
      <div class="setting-tooltip">${f.description}</div>
      <div class="setting-info">
        <div class="drag-handle" title="Drag to reorder">
          ${dragHandleIcon}
        </div>
        <span class="setting-icon">${f.icon}</span>
        <span class="setting-label">${f.label}</span>
      </div>
      <div class="setting-actions">
        <button class="btn-hide ${isHidden ? 'is-hidden' : ''}" data-id="${f.id}" title="${hideTitle}">
          ${hideBtnIcon}
        </button>
        <label class="switch">
          <input type="checkbox" id="${toggleId}" ${isEnabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `;
}

function initDragAndDrop() {
  const container = document.getElementById("settingsList");
  if (!container) return;

  let dragEl = null;

  container.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".setting-item");
    if (!item) return;
    dragEl = item;
    item.classList.add("dragging");
    container.classList.add("reordering");
    e.dataTransfer.effectAllowed = "move";
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(".setting-item");
    if (!target || target === dragEl) return;
    
    const rect = target.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    container.insertBefore(dragEl, next ? target.nextSibling : target);
  });

  container.addEventListener("dragend", () => {
    if (dragEl) {
      dragEl.classList.remove("dragging");
      dragEl = null;
    }
    container.classList.remove("reordering");
    saveNewOrder();
  });
}

function saveNewOrder() {
  const items = Array.from(document.querySelectorAll("#settingsList .setting-item"));
  const newOrder = items.map(item => item.dataset.featureId);
  
  chrome.storage.local.set({ feature_order: newOrder }, () => {
    updateNav();
  });
}

function loadSettings() {
  const keys = FEATURES.map(f => f.storageKey).concat(["hidden_features", "feature_order"]);
  chrome.storage.local.get(keys, (data) => {
    const hiddenFeatures = data.hidden_features || [];
    const order = data.feature_order || FEATURES.map(f => f.id);
    const container = document.getElementById("settingsList");
    if (!container) return;

    let enabledCount = 0;
    FEATURES.forEach(f => {
      const isEnabled = data[f.storageKey] !== undefined ? data[f.storageKey] !== false : f.default;
      if (isEnabled) enabledCount++;
    });

    const headerTitle = document.querySelector("#page-settings .settings-header h2");
    if (headerTitle) {
      headerTitle.textContent = `${enabledCount} of ${FEATURES.length} features active`;
    }

    const sortedFeatures = [...FEATURES].sort((a, b) => {
      let idxA = order.indexOf(a.id);
      let idxB = order.indexOf(b.id);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });

    let html = "";
    sortedFeatures.forEach(f => {
      const isEnabled = data[f.storageKey] !== undefined ? data[f.storageKey] !== false : f.default;
      const isHidden = hiddenFeatures.includes(f.id);
      const isVisible = !isHidden || showHidden;
      
      html += renderFeatureRow(f, isEnabled, isHidden, isVisible);
    });

    container.innerHTML = html || `<div class="empty">No features to display</div>`;
    initDragAndDrop();

    container.querySelectorAll(".switch input").forEach(input => {
      input.addEventListener("change", () => {
        const item = input.closest(".setting-item");
        const featureId = item.dataset.featureId;
        const feature = FEATURES.find(f => f.id === featureId);
        
        chrome.storage.local.set({ [feature.storageKey]: input.checked }, () => {
          if (featureId === "darkmode") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) {
                chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
              }
            });
          }
          if (featureId === "nocookie") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) chrome.tabs.sendMessage(tab.id, { type: "nocookie_toggle", enabled: input.checked }).catch(() => {});
            });
          }
          if (featureId === "unhook") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled: input.checked }).catch(() => {});
            });
          }
          if (featureId === "xunhook") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) chrome.tabs.sendMessage(tab.id, { type: "xunhook_toggle", enabled: input.checked }).catch(() => {});
            });
          }
          if (featureId === "xdim") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) chrome.tabs.sendMessage(tab.id, { type: "xdim_toggle", enabled: input.checked }).catch(() => {});
            });
          }
          if (featureId === "jsonformat") {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab) chrome.tabs.sendMessage(tab.id, { type: "jsonformat_toggle", enabled: input.checked }).catch(() => {});
            });
          }
          
          loadSettings();
          updateNav();
        });
      });
    });

    container.querySelectorAll(".btn-hide").forEach(btn => {
      btn.addEventListener("click", () => {
        const featureId = btn.dataset.id;
        chrome.storage.local.get(["hidden_features"], (res) => {
          let list = res.hidden_features || [];
          if (list.includes(featureId)) {
            list = list.filter(id => id !== featureId);
          } else {
            list.push(featureId);
          }
          chrome.storage.local.set({ hidden_features: list }, () => {
            loadSettings();
            updateNav();
          });
        });
      });
    });
  });
}

document.getElementById("btnSelectAll").addEventListener("click", () => {
  const updates = {};
  FEATURES.forEach(f => {
    updates[f.storageKey] = true;
  });
  chrome.storage.local.set(updates, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "nocookie_toggle", enabled: true }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled: true }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "xunhook_toggle", enabled: true }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "xdim_toggle", enabled: true }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "jsonformat_toggle", enabled: true }).catch(() => {});
      }
    });
    loadSettings();
    updateNav();
  });
});

document.getElementById("btnUnselectAll").addEventListener("click", () => {
  const updates = {};
  FEATURES.forEach(f => {
    updates[f.storageKey] = false;
  });
  chrome.storage.local.set(updates, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "nocookie_toggle", enabled: false }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled: false }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "xunhook_toggle", enabled: false }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "xdim_toggle", enabled: false }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { type: "jsonformat_toggle", enabled: false }).catch(() => {});
      }
    });
    loadSettings();
    updateNav();
  });
});

document.getElementById("btnToggleShowHidden").addEventListener("click", () => {
  showHidden = !showHidden;
  const btn = document.getElementById("btnToggleShowHidden");
  if (showHidden) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
  loadSettings();
});

// Initial layout & descriptions load
loadTabDescriptions();
updateNav();

// ═══════════════════════════════════
//  Helpers
// ═══════════════════════════════════
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function escA(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
