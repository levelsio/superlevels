// ═══════════════════════════════════
//  Navigation & Customization Setup
// ═══════════════════════════════════
// Every feature, in default menu order. storageKey is the real on/off switch
// the feature's own code reads, so turning a feature off in Settings really
// stops it (the background worker / content scripts check the same key).
const FEATURES = [
  { id: "tabcleaner", label: "Tab Cleaner", icon: "🚮", navLabel: "Tabs", storageKey: "enabled", default: true, hasTab: true, description: "Automatically closes inactive tabs after a configurable timeout. Set excluded hosts to keep important tabs alive. View and re-open recently closed tabs." },
  { id: "cookies", label: "Cookie Editor", icon: "🍪", navLabel: "Cookies", storageKey: "feature_cookies_enabled", default: true, hasTab: true, description: "Full cookie manager for the current site. View, edit, add, and delete cookies. Export cookies as JSON." },
  { id: "redirects", label: "Redirect Tracer", icon: "🔀", navLabel: "Redirects", storageKey: "feature_redirects_enabled", default: true, hasTab: true, description: "See every redirect hop your browser took to reach the current page. Shows status codes with a visual chain." },
  { id: "darkmode", label: "Dark Mode", icon: "🌙", navLabel: "Dark", storageKey: "feature_darkmode_enabled", default: true, hasTab: true, description: "Instant dark mode for any website using CSS filter inversion. Adjustable brightness. Toggle per-site, globally, or follow system theme." },
  { id: "xdim", label: "𝕏 Dim Mode", icon: "𝕏", navLabel: "Dim", storageKey: "xdim_enabled", default: false, hasTab: true, description: "Applies a custom dim theme to X / Twitter. Choose a theme or set a custom hue for less eye strain." },
  { id: "xunhook", label: "𝕏 Unhook", icon: "𝕏", navLabel: "Unhook", storageKey: "xunhook_enabled", default: true, hasTab: true, description: "Removes X / Twitter distractions like sidebar panels (trends, news), keeping search and primary navigation clear." },
  { id: "xreply", label: "𝕏 Reply Audience", icon: "𝕏", navLabel: "Reply", storageKey: "xreply_enabled", default: true, hasTab: true, description: "Auto-selects \"Accounts you follow and who they follow\" as the reply audience when you start a new post on X." },
  { id: "xselect", label: "𝕏 Multi-Select", icon: "𝕏", navLabel: "Select", storageKey: "xselect_enabled", default: true, hasTab: true, description: "Adds checkboxes to replies on X so you can Hide, Block, or Hide + Block many replies at once." },
  { id: "photopea", label: "Photopea No Ads", icon: "🫛", navLabel: "Photopea", storageKey: "photopea_enabled", default: true, hasTab: true, description: "Hides the ad column on photopea.com and expands the editor to the full window width." },
  { id: "tiktok", label: "TikTok Login Skipper", icon: "🎶", navLabel: "TikTok", storageKey: "tiktok_enabled", default: true, hasTab: true, description: "Auto-skips TikTok's login and birthday popups so you can scroll and click without an account." },
  { id: "archive", label: "No Paywall", icon: "🗄", navLabel: "No paywall", storageKey: "archive_enabled", default: true, hasTab: true, description: "Opens articles on listed paywalled news sites on archive.is instead. Homepages and section fronts are left alone." },
  { id: "jstoggle", label: "JS Toggle", icon: "⚡", navLabel: "JS", storageKey: "feature_jstoggle_enabled", default: true, hasTab: true, description: "Disable JavaScript for the current site. The page will reload when toggled. Turning this feature off does not re-enable JavaScript on sites you already blocked." },
  { id: "nocookie", label: "Cookies=OK (GDPR Consent)", icon: "🚫", navLabel: "Cookies=OK", storageKey: "nocookie_enabled", default: true, hasTab: true, description: "Auto-dismisses cookie consent popups. Hides banners via CSS and auto-clicks accept buttons for common consent frameworks." },
  { id: "livecss", label: "CSS Editor", icon: "🎨", navLabel: "CSS", storageKey: "feature_livecss_enabled", default: true, hasTab: true, description: "Write custom CSS for any website, applied in real-time as you type. Saved per-domain." },
  { id: "unhook", label: "YouTube Unhook", icon: "📺", navLabel: "YT Unhook", storageKey: "unhook_enabled", default: true, hasTab: true, description: "Removes YouTube distractions: no homepage feed, no sidebar suggestions, no end screen overlays, no Shorts." },
  { id: "music", label: "Music Recognizer", icon: "🎵", navLabel: "Music", storageKey: "feature_music_enabled", default: true, hasTab: true, description: "Shazam-like music identification for any tab. Captures audio and identifies the song via ACRCloud." },
  { id: "summarize", label: "AI Summarize", icon: "✨", navLabel: "Summarize", storageKey: "feature_summarize_enabled", default: true, hasTab: true, description: "Summarizes the current page with OpenAI, Anthropic, or xAI using your own API key." },
  { id: "pip", label: "Picture-in-Picture", icon: "🖼", navLabel: "PiP", storageKey: "feature_pip_enabled", default: true, hasTab: true, description: "Pops the largest video on the current tab into a floating PiP window. Click again to exit." },
  { id: "jsonformat", label: "JSON Formatter", icon: "{}", navLabel: "JSON", storageKey: "jsonformat_enabled", default: true, hasTab: true, description: "Auto-detects pure JSON response pages and formats them with syntax highlighting, collapsible sections, and a dark theme." },
  { id: "gmaps", label: "Google Maps Links", icon: "🗺", navLabel: "", storageKey: "feature_gmaps_enabled", default: true, hasTab: false, description: "Re-adds clickable Google Maps links and map preview cards to Google Search results. Takes effect on the next Google page load." },
  { id: "viewimage", label: "View Image Button", icon: "🖼", navLabel: "", storageKey: "feature_viewimage_enabled", default: true, hasTab: false, description: "Adds a 'View Image' button back to Google Images, linking directly to the full-size original image. Takes effect on the next Google page load." }
];

function isFeatureEnabled(f, data) {
  return data[f.storageKey] !== undefined ? data[f.storageKey] !== false : f.default;
}

function sortFeatures(order) {
  return [...FEATURES].sort((a, b) => {
    let idxA = order.indexOf(a.id);
    let idxB = order.indexOf(b.id);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });
}

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
  // Defer the data-loading work so the page swap paints first
  const load = () => {
    if (page === "cookies") loadCookies();
    else if (page === "redirects") loadRedirects();
    else if (page === "darkmode") loadDarkMode();
    else if (page === "xdim") loadXDim();
    else if (page === "jstoggle") loadJsToggle();
    else if (page === "nocookie") loadNoCookie();
    else if (page === "livecss") loadLiveCSS();
    else if (page === "unhook") loadUnhook();
    else if (page === "xunhook") loadXUnhook();
    else if (page === "xreply") loadXReply();
    else if (page === "xselect") loadXSelect();
    else if (page === "photopea") loadPhotopea();
    else if (page === "tiktok") loadTikTok();
    else if (page === "archive") loadArchive();
    else if (page === "jsonformat") loadJsonFormat();
    else if (page === "summarize") loadSummarize();
    else if (page === "music") { loadMusicHistory(); loadAcrFields(); }
    else if (page === "settings") loadSettings();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(load);
  else setTimeout(load, 0);
  chrome.storage.local.set({ last_tab: page });
}

// Builds the nav from FEATURES: skips features that are turned off or hidden,
// uses the saved custom order, and always ends with Settings.
// restoreTab=true opens the last used tab (popup start); otherwise the
// current page stays open if it is still in the nav.
function updateNav(restoreTab) {
  const keys = FEATURES.map(f => f.storageKey).concat(["hidden_features", "last_tab", "feature_order"]);
  chrome.storage.local.get(keys, (data) => {
    const hiddenFeatures = data.hidden_features || [];
    const order = data.feature_order || FEATURES.map(f => f.id);
    const current = document.querySelector(".nav button.active");
    let activePage = restoreTab || !current
      ? (data.last_tab || "tabcleaner")
      : current.dataset.page;

    const navBar = document.getElementById("navBar");
    if (!navBar) return;

    navBar.innerHTML = "";
    let firstVisiblePage = "";
    const addButton = (page, text) => {
      const btn = document.createElement("button");
      btn.dataset.page = page;
      btn.textContent = text;
      btn.addEventListener("click", () => {
        switchToPage(page);
        // Clicking the PiP tab toggles PiP right away (needs the user gesture,
        // so only on a real click — not when restoring last_tab)
        if (page === "pip") enterPiP();
      });
      navBar.appendChild(btn);
    };

    sortFeatures(order).forEach((f) => {
      if (!f.hasTab) return;
      if (!isFeatureEnabled(f, data) || hiddenFeatures.includes(f.id)) return;
      addButton(f.id, `${f.icon} ${f.navLabel}`);
      if (!firstVisiblePage) firstVisiblePage = f.id;
    });
    addButton("settings", "⚙️ Settings");

    const target = navBar.querySelector(`button[data-page="${activePage}"]`)
      ? activePage
      : (firstVisiblePage || "settings");
    // Repaint the active state; only reload page data when the page changes
    const pageEl = document.getElementById("page-" + target);
    if (pageEl && pageEl.classList.contains("active") && !restoreTab) {
      navBar.querySelector(`button[data-page="${target}"]`).classList.add("active");
    } else {
      switchToPage(target);
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
    // Already listed (with or without the "exact:" prefix)?
    if (exclusions.includes(host) || exclusions.includes("exact:" + host)) { hostInput.value = ""; return; }
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

// Defer closed-tab history (up to 50 favicon img loads) until after first paint
requestAnimationFrame(loadClosedTabs);

// ═══════════════════════════════════
//  Cookie Editor
// ═══════════════════════════════════
const cookieDomainEl = document.getElementById("cookieDomain");
const cookieCountEl = document.getElementById("cookieCount");
const cookieListEl = document.getElementById("cookieList");

let currentUrl = "";
let currentDomain = "";
let allCookies = [];

function getCookieFilterQuery() {
  const filterInput = document.getElementById("cookieFilter");
  return filterInput ? filterInput.value.trim().toLowerCase() : "";
}

function filterAndRenderCookies() {
  const filterInput = document.getElementById("cookieFilter");
  const query = getCookieFilterQuery();

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
    cookieListEl.innerHTML = allCookies.length
      ? '<div class="empty">No cookies match the filter</div>'
      : '<div class="empty">No cookies for this site</div>';
    return;
  }
  // Each row carries its index in allCookies (not in the filtered list), so
  // Delete / Save always act on the cookie shown in that row
  cookieListEl.innerHTML = cookies.map((c) => ({ c, i: allCookies.indexOf(c) })).map(({ c, i }) => `
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
    const query = getCookieFilterQuery();
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

// Stored values: true/"on", false/"off", "system" (old booleans still work)
function normalizeDarkMode(raw) {
  if (raw === true || raw === "on") return "on";
  if (raw === "system") return "system";
  return "off";
}

function showDarkMode(mode) {
  const container = document.getElementById("darkPillSelector");
  if (!container) return;
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

  // "All sites" shows the global setting; "This site only" shows what applies here
  const siteState = data[siteKey];
  const globalState = data.darkmode_global;
  const rawMode = darkScope === "global" ? globalState : (siteState !== undefined ? siteState : globalState);
  showDarkMode(normalizeDarkMode(rawMode));
}

async function notifyDarkModeTab() {
  // The content script re-reads storage and re-checks the page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "darkmode_toggle" }).catch(() => {});
  }
}

async function setDarkMode(mode) {
  showDarkMode(mode);

  if (darkScope === "global") {
    await chrome.storage.local.set({ darkmode_global: mode });
    // "All sites" is a master switch: clear any per-site overrides so that
    // toggling it (esp. OFF) truly applies everywhere. Otherwise a leftover
    // per-site value keeps winning over global and the site stays dark.
    const all = await chrome.storage.local.get(null);
    const overrides = Object.keys(all).filter(
      (k) =>
        k.startsWith("darkmode_") &&
        k !== "darkmode_global" &&
        k !== "darkmode_brightness"
    );
    if (overrides.length) await chrome.storage.local.remove(overrides);
  } else {
    const siteKey = "darkmode_" + darkHost;
    await chrome.storage.local.set({ [siteKey]: mode });
  }

  await notifyDarkModeTab();
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
  await notifyDarkModeTab();
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

// ═══════════════════════════════════
//  Cookie Consent (GDPR) Dismisser
// ═══════════════════════════════════
let nocookieHost = "";

async function loadNoCookie() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const container = document.getElementById("nocookieCurrentSite");
  const hostLabel = document.getElementById("nocookieHost");
  const btnExclude = document.getElementById("btnNocookieExclude");
  const listHeader = document.getElementById("nocookieExclusionsHeader");
  const exclListEl = document.getElementById("nocookieExclusionsList");

  if (!container || !hostLabel || !btnExclude || !listHeader || !exclListEl) return;

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
      exclListEl.innerHTML = exclusions
        .map((h) => `<div class="item"><span>${esc(h)}</span><button data-host="${escA(h)}">&times;</button></div>`)
        .join("");

      exclListEl.querySelectorAll("button[data-host]").forEach((btn) => {
        btn.addEventListener("click", () => removeNocookieExclusion(btn.dataset.host));
      });
    } else {
      listHeader.style.display = "none";
      exclListEl.innerHTML = "";
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
const unhookFeatureEls = document.querySelectorAll("#unhookFeatures .unhook-feature");
const UNHOOK_FEATURE_DEFAULTS = { homepage: true, sidebar: true, endscreen: true, shorts: true, wider: true };

async function getUnhookFeatures() {
  const data = await chrome.storage.local.get(["unhook_features"]);
  return { ...UNHOOK_FEATURE_DEFAULTS, ...(data.unhook_features || {}) };
}

async function loadUnhook() {
  const features = await getUnhookFeatures();
  unhookFeatureEls.forEach((el) => {
    el.classList.toggle("off", features[el.dataset.feature] === false);
  });
}

async function pushUnhookState() {
  const data = await chrome.storage.local.get(["unhook_enabled"]);
  const enabled = data.unhook_enabled !== false;
  const features = await getUnhookFeatures();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled, features }).catch(() => {});
  }
}

unhookFeatureEls.forEach((el) => {
  el.addEventListener("click", async () => {
    const features = await getUnhookFeatures();
    const key = el.dataset.feature;
    features[key] = !features[key];
    el.classList.toggle("off", !features[key]);
    await chrome.storage.local.set({ unhook_features: features });
    await pushUnhookState();
  });
});

// ═══════════════════════════════════
//  X Unhook
// ═══════════════════════════════════
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadXUnhook() {}

// ═══════════════════════════════════
//  Photopea No Ads
// ═══════════════════════════════════
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadPhotopea() {}

// ═══════════════════════════════════
//  TikTok Login Skipper
// ═══════════════════════════════════
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadTikTok() {}

// ═══════════════════════════════════
//  No Paywall
// ═══════════════════════════════════
const ARCHIVE_DEFAULT_SITES = [
  "nytimes.com", "wsj.com", "ft.com", "bloomberg.com", "washingtonpost.com",
  "economist.com", "newyorker.com", "theatlantic.com", "wired.com",
  "businessinsider.com", "telegraph.co.uk", "thetimes.co.uk", "latimes.com",
  "theverge.com", "reuters.com", "fortune.com", "newscientist.com",
  "scientificamerican.com", "404media.co", "forbes.com", "technologyreview.com",
  "foreignpolicy.com", "afr.com", "smh.com.au", "theglobeandmail.com", "scmp.com",
  "chronicle.com", "ajc.com", "texasmonthly.com", "outsideonline.com", "americanbanker.com",
  "spectator.co.uk", "newstatesman.com", "irishtimes.com",
  // Netherlands / Belgium
  "nrc.nl", "volkskrant.nl", "telegraaf.nl", "parool.nl", "trouw.nl", "ad.nl", "fd.nl",
  "ftm.nl", "nd.nl", "rd.nl", "groene.nl",
  "gelderlander.nl", "bndestem.nl", "bd.nl", "ed.nl", "pzc.nl", "tubantia.nl", "destentor.nl",
  "noordhollandsdagblad.nl", "haarlemsdagblad.nl", "leidschdagblad.nl", "gooieneemlander.nl",
  "ijmuidercourant.nl", "limburger.nl", "dvhn.nl", "lc.nl",
  "standaard.be", "demorgen.be", "hln.be", "nieuwsblad.be", "gva.be", "hbvl.be", "tijd.be",
  // Germany / Austria / Switzerland
  "spiegel.de", "zeit.de", "faz.net", "sueddeutsche.de", "welt.de", "handelsblatt.com",
  "tagesspiegel.de", "derstandard.at", "diepresse.com", "nzz.ch", "tagesanzeiger.ch",
  // France / Italy / Spain
  "lemonde.fr", "lefigaro.fr", "liberation.fr", "lesechos.fr", "mediapart.fr", "lepoint.fr",
  "corriere.it", "repubblica.it", "ilsole24ore.com", "elpais.com", "elmundo.es", "lavanguardia.com",
  // Nordics
  "dn.se", "svd.se", "aftenposten.no", "hs.fi", "politiken.dk", "berlingske.dk",
];
const archiveSites = document.getElementById("archiveSites");

async function loadArchive() {
  const data = await chrome.storage.local.get(["archive_sites"]);
  const sites = Array.isArray(data.archive_sites) ? data.archive_sites : ARCHIVE_DEFAULT_SITES;
  archiveSites.value = sites.join("\n");
}

let archiveSaveTimer;
archiveSites.addEventListener("input", () => {
  clearTimeout(archiveSaveTimer);
  archiveSaveTimer = setTimeout(() => {
    const sites = archiveSites.value.split("\n")
      .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
      .filter(Boolean);
    chrome.storage.local.set({ archive_sites: sites });
  }, 300);
});

// ═══════════════════════════════════
//  X Reply Auto-Select
// ═══════════════════════════════════
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadXReply() {}

// ═══════════════════════════════════
//  X Multi-Select Replies
// ═══════════════════════════════════
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadXSelect() {}

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
// (On/off lives in Settings — see FEATURE_TOGGLE_EFFECTS)
function loadJsonFormat() {}

// ═══════════════════════════════════
//  AI Summarize
// ═══════════════════════════════════
const AI_PROVIDERS = {
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4o",
    signup: "https://platform.openai.com/api-keys",
    keyHint: "(sk-...)",
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-opus-4-8",
    signup: "https://console.anthropic.com/settings/keys",
    keyHint: "(sk-ant-...)",
  },
  xai: {
    label: "xAI",
    defaultModel: "grok-4",
    signup: "https://console.x.ai/",
    keyHint: "(xai-...)",
  },
};

const LENGTH_PROMPTS = {
  brief: "Summarize it in 3-4 clear sentences.",
  bullets: "Summarize it as 5-8 concise bullet points, each starting with '- '.",
  detailed: "Write a detailed summary with a short intro paragraph followed by key points.",
};

const aiProviderEl = document.getElementById("aiProvider");
const aiLengthEl = document.getElementById("aiLength");
const aiKeyEl = document.getElementById("aiKey");
const aiModelEl = document.getElementById("aiModel");
const aiResultEl = document.getElementById("aiResult");
const aiConfigEl = document.getElementById("aiConfig");
const summarizeBtn = document.getElementById("summarizeBtn");

function loadSummarize() {
  chrome.storage.local.get(["ai_provider", "ai_length"], (data) => {
    aiProviderEl.value = data.ai_provider || "openai";
    if (data.ai_length) aiLengthEl.value = data.ai_length;
    refreshAiProviderFields();
  });
}

// Populate key + model inputs and signup link for the currently selected provider
function refreshAiProviderFields() {
  const provider = aiProviderEl.value;
  const cfg = AI_PROVIDERS[provider];
  chrome.storage.local.get(
    [`ai_key_${provider}`, `ai_model_${provider}`],
    (data) => {
      const key = data[`ai_key_${provider}`] || "";
      aiKeyEl.value = key;
      aiModelEl.value = data[`ai_model_${provider}`] || cfg.defaultModel;
      document.getElementById("aiSignupLink").href = cfg.signup;
      document.getElementById("aiKeyHint").textContent = cfg.keyHint;
      // Auto-open config if no key saved for this provider yet
      aiConfigEl.style.display = key ? "none" : "block";
    }
  );
}

aiProviderEl.addEventListener("change", () => {
  chrome.storage.local.set({ ai_provider: aiProviderEl.value });
  refreshAiProviderFields();
});

aiLengthEl.addEventListener("change", () => {
  chrome.storage.local.set({ ai_length: aiLengthEl.value });
});

document.getElementById("aiSettingsBtn").addEventListener("click", () => {
  aiConfigEl.style.display = aiConfigEl.style.display === "none" ? "block" : "none";
});

document.getElementById("aiSaveBtn").addEventListener("click", () => {
  const provider = aiProviderEl.value;
  const cfg = AI_PROVIDERS[provider];
  chrome.storage.local.set(
    {
      [`ai_key_${provider}`]: aiKeyEl.value.trim(),
      [`ai_model_${provider}`]: aiModelEl.value.trim() || cfg.defaultModel,
    },
    () => {
      aiConfigEl.style.display = "none";
    }
  );
});

function showAiResult(html, cls) {
  aiResultEl.className = "ai-result show";
  aiResultEl.innerHTML = cls === "err" ? `<span class="ai-err">${html}</span>` : html;
}

// Grab the visible text of the active tab, capped to keep token use sane
function extractPageText() {
  const el = document.querySelector("main, article") || document.body;
  const text = (el.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
  return { title: document.title, url: location.href, text: text.slice(0, 20000) };
}

summarizeBtn.addEventListener("click", async () => {
  const provider = aiProviderEl.value;
  const cfg = AI_PROVIDERS[provider];
  const key = aiKeyEl.value.trim();
  const model = aiModelEl.value.trim() || cfg.defaultModel;

  if (!key) {
    aiConfigEl.style.display = "block";
    showAiResult(`Add your ${cfg.label} API key first.`, "err");
    return;
  }

  summarizeBtn.disabled = true;
  showAiResult(`<span class="ai-spin">Reading page…</span>`);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || /^(chrome|edge|about|chrome-extension):/.test(tab.url || "")) {
      throw new Error("Can't read this page. Open a normal website tab.");
    }
    const [{ result: page } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText,
    });
    if (!page || !page.text) throw new Error("No readable text found on this page.");

    showAiResult(`<span class="ai-spin">Summarizing with ${cfg.label}…</span>`);

    const system =
      "You are a helpful assistant that summarizes web pages. Be accurate and concise. Use plain text with '- ' for bullet points.";
    const user =
      `Summarize this web page. ${LENGTH_PROMPTS[aiLengthEl.value]}\n\n` +
      `Title: ${page.title}\nURL: ${page.url}\n\n${page.text}`;

    const summary = await callAiProvider(provider, model, key, system, user);
    renderSummary(summary);
    chrome.storage.local.set({ ai_length: aiLengthEl.value });
  } catch (err) {
    showAiResult(esc(err.message || "Something went wrong."), "err");
  } finally {
    summarizeBtn.disabled = false;
  }
});

// Dispatch to the right provider API. Returns the summary text.
async function callAiProvider(provider, model, key, system, user) {
  let url, headers, body, pick;

  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // Required for calling the API directly from a browser/extension context
      "anthropic-dangerous-direct-browser-access": "true",
    };
    body = {
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    };
    pick = (d) => (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  } else {
    // OpenAI and xAI share the OpenAI-compatible chat completions shape
    url =
      provider === "xai"
        ? "https://api.x.ai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    headers = { "content-type": "application/json", Authorization: `Bearer ${key}` };
    body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    pick = (d) => d.choices?.[0]?.message?.content || "";
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error?.type || `HTTP ${res.status}`;
    throw new Error(`${AI_PROVIDERS[provider].label}: ${msg}`);
  }
  const text = pick(data);
  if (!text) throw new Error("Empty response from provider.");
  return text.trim();
}

// Minimal safe markdown: escape, then **bold**, and '- ' bullet lists
function renderSummary(text) {
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+/.test(line);
    if (bullet) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${fmtInline(line.replace(/^[-*•]\s+/, ""))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      if (line) html += `<p style="margin:6px 0">${fmtInline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  showAiResult(`<button class="ai-copy" id="aiCopyBtn">Copy</button>${html}`);
  document.getElementById("aiCopyBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      const b = document.getElementById("aiCopyBtn");
      b.textContent = "Copied!";
      setTimeout(() => (b.textContent = "Copy"), 1500);
    });
  });
}

function fmtInline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

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

// ═══════════════════════════════════
//  Settings Panel Customization
// ═══════════════════════════════════
let showHidden = false;

// Send a message to every open tab (or the tabs matching urls), ignoring
// tabs without our content script
async function messageTabs(msg, urls) {
  const tabs = await chrome.tabs.query(urls ? { url: urls } : {});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }
}

const PHOTOPEA_URLS = ["*://www.photopea.com/*", "*://photopea.com/*"];
const TIKTOK_URLS = ["*://www.tiktok.com/*", "*://tiktok.com/*"];

// What has to happen, besides saving the switch, when a feature is turned
// on or off, so already-open pages follow the setting right away.
// Features not listed need nothing more: the background worker reads the
// switch itself (tab cleaner, redirects, PiP, No Paywall), the feature only
// lives in this popup (cookies, JS toggle, music, summarize), or it applies
// on the next page load (Google Maps links, View Image).
const FEATURE_TOGGLE_EFFECTS = {
  darkmode: () => messageTabs({ type: "darkmode_toggle" }),
  xdim: (enabled) => messageTabs({ type: "xdim_toggle", enabled }),
  xunhook: (enabled) => messageTabs({ type: "xunhook_toggle", enabled }),
  xreply: (enabled) => messageTabs({ type: "xreply_toggle", enabled }),
  xselect: (enabled) => messageTabs({ type: "xselect_toggle", enabled }),
  nocookie: (enabled) => messageTabs({ type: "nocookie_toggle", enabled }),
  livecss: (enabled) => messageTabs({ type: "livecss_feature_toggle", enabled }),
  jsonformat: (enabled) => messageTabs({ type: "jsonformat_toggle", enabled }),
  tiktok: (enabled) => messageTabs({ type: "tiktok_toggle", enabled }, TIKTOK_URLS),
  unhook: async (enabled) => {
    const features = await getUnhookFeatures();
    await messageTabs({ type: "unhook_toggle", enabled, features });
  },
  // The width fix runs at page load, so reload any open Photopea tabs
  photopea: async () => {
    const tabs = await chrome.tabs.query({ url: PHOTOPEA_URLS });
    for (const tab of tabs) chrome.tabs.reload(tab.id).catch(() => {});
  },
};

// Save the on/off state of several features and apply the effects of the
// ones that actually changed
async function setFeaturesEnabled(updates) {
  const features = FEATURES.filter(f => f.id in updates);
  const before = await chrome.storage.local.get(features.map(f => f.storageKey));
  const toSave = {};
  features.forEach(f => { toSave[f.storageKey] = updates[f.id]; });
  await chrome.storage.local.set(toSave);
  for (const f of features) {
    if (isFeatureEnabled(f, before) !== updates[f.id] && FEATURE_TOGGLE_EFFECTS[f.id]) {
      await FEATURE_TOGGLE_EFFECTS[f.id](updates[f.id]);
    }
  }
}

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
      <div class="setting-tooltip">${esc(f.description)}</div>
      <div class="setting-info">
        <div class="drag-handle" title="Drag to reorder">
          ${dragHandleIcon}
        </div>
        <span class="setting-icon">${esc(f.icon)}</span>
        <span class="setting-label">${esc(f.label)}</span>
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
  if (!container || container.dataset.dndReady) return;
  // Listeners live on the container, which is reused across re-renders,
  // so attach them only once
  container.dataset.dndReady = "1";

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
    if (!dragEl) return;
    const target = e.target.closest(".setting-item");
    if (!target || target === dragEl) return;

    const rect = target.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    container.insertBefore(dragEl, next ? target.nextSibling : target);
  });

  container.addEventListener("dragend", () => {
    if (!dragEl) return;
    dragEl.classList.remove("dragging");
    dragEl = null;
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

    const enabledCount = FEATURES.filter(f => isFeatureEnabled(f, data)).length;

    const headerTitle = document.querySelector("#page-settings .settings-header h2");
    if (headerTitle) {
      headerTitle.textContent = `${enabledCount} of ${FEATURES.length} features active`;
    }

    let html = "";
    sortFeatures(order).forEach(f => {
      const isHidden = hiddenFeatures.includes(f.id);
      const isVisible = !isHidden || showHidden;
      html += renderFeatureRow(f, isFeatureEnabled(f, data), isHidden, isVisible);
    });

    container.innerHTML = html || `<div class="empty">No features to display</div>`;
    initDragAndDrop();

    container.querySelectorAll(".switch input").forEach(input => {
      input.addEventListener("change", async () => {
        const featureId = input.closest(".setting-item").dataset.featureId;
        await setFeaturesEnabled({ [featureId]: input.checked });
        loadSettings();
        updateNav();
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

async function setAllFeatures(enabled) {
  const updates = {};
  FEATURES.forEach(f => { updates[f.id] = enabled; });
  await setFeaturesEnabled(updates);
  loadSettings();
  updateNav();
}

document.getElementById("btnSelectAll").addEventListener("click", () => setAllFeatures(true));
document.getElementById("btnUnselectAll").addEventListener("click", () => setAllFeatures(false));

document.getElementById("btnToggleShowHidden").addEventListener("click", () => {
  showHidden = !showHidden;
  const btn = document.getElementById("btnToggleShowHidden");
  btn.classList.toggle("active", showHidden);
  loadSettings();
});

// Initial layout & descriptions load (restores the last open tab)
loadTabDescriptions();
updateNav(true);
