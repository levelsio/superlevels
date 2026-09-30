const DEFAULT_TIMEOUT_MIN = 5;
const CHECK_INTERVAL_MIN = 1;

// { tabId: lastActiveTimestamp }
const tabActivity = {};

// Record activity for a tab
function markActive(tabId) {
  tabActivity[tabId] = Date.now();
}

// On tab activated (user switches to it)
chrome.tabs.onActivated.addListener(({ tabId }) => {
  markActive(tabId);
});

// On tab updated (page load, navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    markActive(tabId);
  }
});

// On tab created
chrome.tabs.onCreated.addListener((tab) => {
  markActive(tab.id);
});

// On tab removed, clean up
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabActivity[tabId];
});

// Initialize: mark all existing tabs as active now
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    markActive(tab.id);
  }
});

// Periodic cleanup check
chrome.alarms.create("tabCleanup", { periodInMinutes: CHECK_INTERVAL_MIN });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "tabCleanup") return;

  const { exclusions = [], enabled = true, timeoutMin = DEFAULT_TIMEOUT_MIN } =
    await chrome.storage.local.get(["exclusions", "enabled", "timeoutMin"]);

  if (!enabled) return;

  const now = Date.now();
  const timeoutMs = timeoutMin * 60 * 1000;
  const tabs = await chrome.tabs.query({});

  // Never close the last tab in a window
  const windowTabCounts = {};
  for (const tab of tabs) {
    windowTabCounts[tab.windowId] = (windowTabCounts[tab.windowId] || 0) + 1;
  }

  // Find the currently active tab so we never close it
  const activeTabs = new Set();
  const windows = await chrome.windows.getAll();
  for (const win of windows) {
    const [active] = await chrome.tabs.query({
      active: true,
      windowId: win.id,
    });
    if (active) activeTabs.add(active.id);
  }

  for (const tab of tabs) {
    // Skip active tabs
    if (activeTabs.has(tab.id)) {
      markActive(tab.id);
      continue;
    }

    // Skip pinned tabs
    if (tab.pinned) continue;

    // Skip if it's the last tab in its window
    if (windowTabCounts[tab.windowId] <= 1) continue;

    // Skip excluded hosts
    if (tab.url) {
      try {
        const host = new URL(tab.url).hostname;
        if (
          exclusions.some(
            (ex) => host === ex || host.endsWith("." + ex)
          )
        ) {
          continue;
        }
      } catch {}
    }

    // Check inactivity
    const lastActive = tabActivity[tab.id] || 0;
    if (now - lastActive >= timeoutMs) {
      windowTabCounts[tab.windowId]--;
      // Save to closed history before removing
      saveClosedTab(tab);
      chrome.tabs.remove(tab.id);
      delete tabActivity[tab.id];
    }
  }
});

// Save closed tab to history
function saveClosedTab(tab) {
  if (!tab.url || tab.url.startsWith("chrome://")) return;
  chrome.storage.local.get(["closed_tabs"], (data) => {
    const closed = data.closed_tabs || [];
    closed.unshift({
      url: tab.url,
      title: tab.title || tab.url,
      favIconUrl: tab.favIconUrl || "",
      time: Date.now(),
    });
    if (closed.length > 50) closed.length = 50;
    chrome.storage.local.set({ closed_tabs: closed });
  });
}

// ═══════════════════════════════════
//  Redirect Tracer
// ═══════════════════════════════════
// { tabId: { chain: [{url, statusCode, statusLine}], finalUrl, finalStatus } }
const redirectData = {};

// When a new main-frame navigation starts, reset the chain
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
});

// Capture each redirect hop
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    if (!redirectData[details.tabId]) {
      redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
    }
    redirectData[details.tabId].chain.push({
      url: details.url,
      statusCode: details.statusCode,
      statusLine: details.statusLine || "",
      redirectUrl: details.redirectUrl,
    });
  },
  { urls: ["<all_urls>"] }
);

// Capture final completed request
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.type !== "main_frame") return;
    if (!redirectData[details.tabId]) {
      redirectData[details.tabId] = { chain: [], finalUrl: null, finalStatus: null };
    }
    redirectData[details.tabId].finalUrl = details.url;
    redirectData[details.tabId].finalStatus = details.statusCode;
  },
  { urls: ["<all_urls>"] }
);

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  delete redirectData[tabId];
});

// Respond to popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getRedirects") {
    sendResponse(redirectData[msg.tabId] || { chain: [], finalUrl: null, finalStatus: null });
  }
  if (msg.type === "pip") {
    chrome.scripting.executeScript({
      target: { tabId: msg.tabId },
      func: () => {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
          return { action: "exited" };
        }
        const videos = Array.from(document.querySelectorAll("video"));
        if (!videos.length) return { error: "No video found on this page" };
        const playing = videos.filter(v => !v.paused && !v.ended);
        let video;
        if (playing.length) {
          video = playing.reduce((a, b) =>
            (b.videoWidth * b.videoHeight) > (a.videoWidth * a.videoHeight) ? b : a
          );
        } else {
          video = videos.reduce((a, b) =>
            (b.videoWidth * b.videoHeight) > (a.videoWidth * a.videoHeight) ? b : a
          );
        }
        const enterPip = () => video.requestPictureInPicture()
          .then(() => ({ action: "entered" }))
          .catch(e => ({ error: e.message }));
        // requestPictureInPicture() throws if metadata isn't loaded yet
        // (readyState 0 = HAVE_NOTHING). Wait for it, then retry.
        if (video.readyState === 0) {
          return new Promise((resolve) => {
            const onReady = () => {
              cleanup();
              resolve(enterPip());
            };
            const onError = () => {
              cleanup();
              resolve({ error: "Video failed to load" });
            };
            const timer = setTimeout(() => {
              cleanup();
              resolve({ error: "Video metadata did not load in time" });
            }, 5000);
            const cleanup = () => {
              clearTimeout(timer);
              video.removeEventListener("loadedmetadata", onReady);
              video.removeEventListener("error", onError);
            };
            video.addEventListener("loadedmetadata", onReady, { once: true });
            video.addEventListener("error", onError, { once: true });
            // Nudge the browser to start loading metadata if it hasn't.
            if (video.preload === "none") video.preload = "metadata";
            video.load();
          });
        }
        return enterPip();
      },
    }).then(results => {
      sendResponse(results[0]?.result || { error: "No result" });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true; // async sendResponse
  }
});

// Set defaults on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled", "timeoutMin", "exclusions"], (data) => {
    const defaults = {};
    if (data.enabled === undefined) defaults.enabled = true;
    if (data.timeoutMin === undefined) defaults.timeoutMin = DEFAULT_TIMEOUT_MIN;
    if (data.exclusions === undefined) defaults.exclusions = [];
    if (Object.keys(defaults).length) {
      chrome.storage.local.set(defaults);
    }
  });
});

// ═══════════════════════════════════
//  Photopea No Ads — MAIN-world script registration
//  (must run in the page world before Photopea's own scripts)
// ═══════════════════════════════════
const PHOTOPEA_SCRIPT_ID = "sl-photopea-main";

let photopeaSyncChain = Promise.resolve();
function syncPhotopeaScript() {
  // Serialize so a toggle during startup can't race the initial registration
  photopeaSyncChain = photopeaSyncChain.then(doSyncPhotopeaScript).catch(() => {});
  return photopeaSyncChain;
}

async function doSyncPhotopeaScript() {
  const { photopea_enabled } = await chrome.storage.local.get(["photopea_enabled"]);
  const enabled = photopea_enabled !== false;
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [PHOTOPEA_SCRIPT_ID] });
  if (enabled && existing.length === 0) {
    await chrome.scripting.registerContentScripts([{
      id: PHOTOPEA_SCRIPT_ID,
      matches: ["*://www.photopea.com/*", "*://photopea.com/*"],
      js: ["photopea-main.js"],
      runAt: "document_start",
      world: "MAIN",
    }]).catch(() => {});
  } else if (!enabled && existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [PHOTOPEA_SCRIPT_ID] }).catch(() => {});
  }
}

syncPhotopeaScript();
chrome.runtime.onInstalled.addListener(syncPhotopeaScript);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.photopea_enabled) syncPhotopeaScript();
});

// ═══════════════════════════════════
//  No Paywall — send paywalled articles straight to archive.is
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
const ARCHIVE_HOSTS = /(^|\.)archive\.(is|ph|today|li|vn|md)$/;

let archiveSettings = { enabled: true, sites: ARCHIVE_DEFAULT_SITES };
function loadArchiveSettings() {
  chrome.storage.local.get(["archive_enabled", "archive_sites"], (d) => {
    archiveSettings = {
      enabled: d.archive_enabled !== false,
      sites: Array.isArray(d.archive_sites) ? d.archive_sites : ARCHIVE_DEFAULT_SITES,
    };
  });
}
loadArchiveSettings();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.archive_enabled || changes.archive_sites)) loadArchiveSettings();
});

// Only articles, not homepages/section fronts: the last path segment
// needs a slug (hyphen) or an .html/.shtml extension. A trailing numeric ID
// (theatlantic.com/.../slug/684123/) is skipped. Single-segment paths need
// a longer slug so fronts like /science-and-technology stay put.
function isArticlePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) parts.pop();
  const last = parts[parts.length - 1] || "";
  if (/\.s?html?$/.test(last)) return true;
  if (/^dmf\d/.test(last)) return true; // Mediahuis regionals: /cnt/dmf20260926_12345678
  const hyphens = (last.match(/-/g) || []).length;
  return parts.length > 1 ? hyphens > 0 : hyphens >= 3;
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || details.documentLifecycle === "prerender") return;
  if (!archiveSettings.enabled) return;
  let url;
  try { url = new URL(details.url); } catch { return; }
  if (!/^https?:$/.test(url.protocol)) return;
  const host = url.hostname.replace(/^www\./, "");
  const match = archiveSettings.sites.some((s) => host === s || host.endsWith("." + s));
  if (!match || !isArticlePath(url.pathname)) return;

  // Coming from an archive page (e.g. clicking its "original" link)? Let it through.
  const tab = await chrome.tabs.get(details.tabId).catch(() => null);
  if (!tab) return;
  try { if (ARCHIVE_HOSTS.test(new URL(tab.url).hostname)) return; } catch {}

  // Drop tracking params/hash so the URL matches existing snapshots
  const clean = url.origin + url.pathname;
  chrome.tabs.update(details.tabId, { url: "https://archive.is/" + clean }).catch(() => {});
});
