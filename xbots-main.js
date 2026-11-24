// ═══════════════════════════════════
//  superlevels: X Bot Blocker — page-world hook
//  Registered by background.js into the MAIN world on x.com while the
//  feature is on. It reads X's own API responses (the data the page is about
//  to render) and passes every user it sees — numeric id, follow and block
//  state — to xbots.js, which decides whether to block. It also passes along
//  the Authorization header X's web app uses, so blocks use the same one.
//  Nothing is sent anywhere else.
// ═══════════════════════════════════
(() => {
  if (window.__slXbots) return;
  window.__slXbots = true;

  const SOURCE = "sl-xbots";
  const isApi = (url) => typeof url === "string" && url.includes("/i/api/");
  let lastAuth = "";

  const post = (data) => window.postMessage({ source: SOURCE, ...data }, location.origin);

  function noteAuth(value) {
    if (typeof value === "string" && /^Bearer /.test(value) && value !== lastAuth) {
      lastAuth = value;
      post({ auth: value });
    }
  }

  function collect(json) {
    const users = new Map();
    const walk = (o, depth) => {
      if (!o || typeof o !== "object" || depth > 80) return;
      if (Array.isArray(o)) { for (const v of o) walk(v, depth + 1); return; }
      if (o.__typename === "User" && typeof o.rest_id === "string" && /^\d+$/.test(o.rest_id)) {
        const l = o.legacy || {};
        const r = o.relationship_perspectives || {};
        users.set(o.rest_id, {
          id: o.rest_id,
          name: o.core?.screen_name || l.screen_name || "",
          following: !!(l.following || r.following),
          blocking: !!(l.blocking || r.blocking),
        });
      }
      for (const k in o) walk(o[k], depth + 1);
    };
    walk(json, 0);
    if (users.size) post({ users: [...users.values()] });
  }

  function collectText(text) {
    if (typeof text !== "string" || !text.includes('"rest_id"')) return;
    try { collect(JSON.parse(text)); } catch (_) {}
  }

  // ── XMLHttpRequest ──
  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSetHeader = XHR.setRequestHeader;
  XHR.open = function (method, url) {
    this.__slUrl = String(url);
    if (isApi(this.__slUrl)) {
      this.addEventListener("load", () => {
        try {
          if (this.responseType === "json") collect(this.response);
          else if (this.responseType === "" || this.responseType === "text") collectText(this.responseText);
        } catch (_) {}
      });
    }
    return origOpen.apply(this, arguments);
  };
  XHR.setRequestHeader = function (name, value) {
    if (isApi(this.__slUrl) && String(name).toLowerCase() === "authorization") noteAuth(value);
    return origSetHeader.apply(this, arguments);
  };

  // ── fetch ──
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || String(input);
    const p = origFetch.apply(this, arguments);
    if (isApi(url)) {
      try {
        const h = init?.headers || (input instanceof Request ? input.headers : null);
        noteAuth(h instanceof Headers ? h.get("authorization") : h?.authorization || h?.Authorization);
      } catch (_) {}
      p.then((res) => {
        if ((res.headers.get("content-type") || "").includes("json")) res.clone().text().then(collectText, () => {});
      }, () => {});
    }
    return p;
  };
})();
