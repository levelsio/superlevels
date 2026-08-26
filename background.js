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

  const {
    exclusions = [],
    enabled = true,
    timeoutMin = DEFAULT_TIMEOUT_MIN,
    excludeAllGroups = false,
    excludedGroupTitles = [],
  } = await chrome.storage.local.get([
    "exclusions",
    "enabled",
    "timeoutMin",
    "excludeAllGroups",
    "excludedGroupTitles",
  ]);

  if (!enabled) return;

  const now = Date.now();
  const timeoutMs = timeoutMin * 60 * 1000;
  const tabs = await chrome.tabs.query({});

  // Resolve titles for any groups containing tabs (only when needed)
  const groupTitleById = {};
  if (excludeAllGroups || excludedGroupTitles.length) {
    const groupIds = new Set();
    for (const tab of tabs) {
      if (typeof tab.groupId === "number" && tab.groupId !== -1) {
        groupIds.add(tab.groupId);
      }
    }
    for (const gid of groupIds) {
      try {
        const g = await chrome.tabGroups.get(gid);
        groupTitleById[gid] = g.title || "";
      } catch {}
    }
  }

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

    // Skip tabs in excluded groups
    if (typeof tab.groupId === "number" && tab.groupId !== -1) {
      if (excludeAllGroups) continue;
      const title = groupTitleById[tab.groupId];
      if (title !== undefined && excludedGroupTitles.includes(title)) {
        continue;
      }
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
        return video.requestPictureInPicture()
          .then(() => ({ action: "entered" }))
          .catch(e => ({ error: e.message }));
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
  chrome.storage.local.get(
    ["enabled", "timeoutMin", "exclusions", "excludeAllGroups", "excludedGroupTitles"],
    (data) => {
      const defaults = {};
      if (data.enabled === undefined) defaults.enabled = true;
      if (data.timeoutMin === undefined) defaults.timeoutMin = DEFAULT_TIMEOUT_MIN;
      if (data.exclusions === undefined) defaults.exclusions = [];
      if (data.excludeAllGroups === undefined) defaults.excludeAllGroups = false;
      if (data.excludedGroupTitles === undefined) defaults.excludedGroupTitles = [];
      if (Object.keys(defaults).length) {
        chrome.storage.local.set(defaults);
      }
    }
  );
});
