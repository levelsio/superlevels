// ═══════════════════════════════════
//  superlevels: X Bot Blocker
//  Auto-blocks accounts on the blockedforaireply.com list, but only the ones
//  you actually come across: xbots-main.js reports every user X loads into
//  the page (timeline, replies, search, profiles...) and any that are on the
//  list get blocked through X's own block endpoint, one at a time.
//  Skips you, accounts you follow, and accounts you already block.
//  Accounts later removed from the list (appeal/review) are unblocked, but
//  only if SuperLevels blocked them. The list itself is fetched by background.js.
// ═══════════════════════════════════
(() => {
  const SOURCE = "sl-xbots";
  // X web app's public bearer token; replaced by the one the page itself uses once seen
  const DEFAULT_AUTH = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const GAP_MS = 1500;               // between block/unblock calls
  const RATE_PAUSE_MS = 15 * 60e3;   // after X says 429

  let enabled = false;
  let listIds = new Set();
  let removed = new Set();
  let blocked = {};                  // id -> { name, at } for accounts SuperLevels blocked
  let auth = "";
  let pausedUntil = 0;
  let dead = false;                  // logged out / auth rejected: stop until reload
  let running = false;
  const queue = [];
  const queued = new Set();
  const failed = new Set();          // ids X refused this page session; don't retry on every sighting

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cookie = (name) => document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"))?.[1] || "";
  const myId = () => decodeURIComponent(cookie("twid")).match(/u=(\d+)/)?.[1] || null;

  function enqueue(action, id, name) {
    const key = action + ":" + id;
    if (queued.has(key)) return;
    queued.add(key);
    queue.push({ action, id, name, key });
    pump();
  }

  // Still worth doing right now? (the list or our records may have changed)
  function stillWanted(job) {
    if (job.action === "create") return listIds.has(job.id) && !removed.has(job.id) && !blocked[job.id];
    return removed.has(job.id) && !!blocked[job.id];
  }

  async function call(action, id) {
    const csrf = cookie("ct0");
    if (!csrf) return 401;
    const res = await fetch(`${location.origin}/i/api/1.1/blocks/${action}.json`, {
      method: "POST",
      credentials: "include",
      headers: {
        authorization: auth || DEFAULT_AUTH,
        "x-csrf-token": csrf,
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-active-user": "yes",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ user_id: id }).toString(),
    });
    return res.status;
  }

  async function pump() {
    if (running) return;
    running = true;
    let forbidden = 0;
    while (queue.length && enabled && !dead) {
      const wait = pausedUntil - Date.now();
      if (wait > 0) { await sleep(Math.min(wait, 60e3)); continue; }
      const job = queue.shift();
      if (!stillWanted(job)) { queued.delete(job.key); continue; }
      let status = 0;
      try { status = await call(job.action, job.id); } catch (_) {}
      if (status === 429) {
        pausedUntil = Date.now() + RATE_PAUSE_MS;
        queue.unshift(job);
        continue;
      }
      queued.delete(job.key);
      if (status === 200 || (job.action === "destroy" && status === 404)) {
        forbidden = 0;
        if (job.action === "create") blocked[job.id] = { name: job.name, at: Date.now() };
        else delete blocked[job.id];
        try {
          await chrome.runtime.sendMessage({
            type: job.action === "create" ? "xbots_blocked" : "xbots_unblocked",
            id: job.id,
            name: job.name || "",
          });
        } catch (_) {}
      } else {
        failed.add(job.id);
        // Not logged in, or X rejects our requests: don't keep hammering
        if (status === 401 || (status === 403 && ++forbidden >= 3)) dead = true;
      }
      await sleep(GAP_MS);
    }
    running = false;
  }

  function onUsers(users) {
    if (!enabled || dead) return;
    const me = myId();
    for (const u of users) {
      if (!u || typeof u.id !== "string") continue;
      if (u.id === me || !listIds.has(u.id) || removed.has(u.id) || blocked[u.id] || failed.has(u.id)) continue;
      if (u.following || u.blocking) continue;
      enqueue("create", u.id, typeof u.name === "string" ? u.name : "");
    }
  }

  function queueUnblocks() {
    if (!enabled) return;
    for (const id of Object.keys(blocked)) {
      if (removed.has(id)) enqueue("destroy", id, blocked[id]?.name || "");
    }
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.source !== SOURCE) return;
    if (typeof e.data.auth === "string" && /^Bearer [\w%=-]+$/.test(e.data.auth)) auth = e.data.auth;
    if (Array.isArray(e.data.users)) onUsers(e.data.users);
  });

  function apply(data) {
    if ("xbots_enabled" in data) enabled = data.xbots_enabled === true;
    if ("xbots_ids" in data) listIds = new Set(data.xbots_ids || []);
    if ("xbots_removed" in data) removed = new Set(data.xbots_removed || []);
    if ("xbots_blocked" in data) blocked = data.xbots_blocked || {};
    queueUnblocks();
    if (enabled) pump();
  }

  chrome.storage.local.get(["xbots_enabled", "xbots_ids", "xbots_removed", "xbots_blocked"], apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const data = {};
    for (const k of ["xbots_enabled", "xbots_ids", "xbots_removed", "xbots_blocked"]) {
      if (changes[k]) data[k] = changes[k].newValue;
    }
    if (Object.keys(data).length) apply(data);
  });
})();
