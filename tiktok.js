// ═══════════════════════════════════
//  superlevels: TikTok Login Skipper
//  Hides TikTok's "Log in to TikTok" modal + backdrop and clicks Skip. Skip
//  only swaps in a "When's your birthday?" step that keeps the page locked
//  (#app gets `inert` + pointer-events:none + a focus lock), so we undo those.
//  Leaves it alone when you click Log in.
// ═══════════════════════════════════
(() => {
  const STYLE_ID = "sl-tiktok";
  const ALLOW_CLASS = "sl-tt-allow-login";

  const CSS = `
    html:not(.${ALLOW_CLASS}) [class*="DivModalContainer"]:has(#login-modal) { display: none !important; }
    html:not(.${ALLOW_CLASS}) body:has(#login-modal) { overflow: auto !important; }
    html:not(.${ALLOW_CLASS}) body:has(#login-modal) #app { pointer-events: auto !important; }
  `;

  let enabled = false;
  let obs = null;
  let scheduled = false;
  let lastClick = 0;
  let modalOpen = false;

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function remove() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function allowLogin(on) {
    document.documentElement.classList.toggle(ALLOW_CLASS, on);
  }

  function findSkip(modal) {
    const btns = modal.querySelectorAll('[class*="DivSkip"], [data-e2e="modal-close-inner-button"], [role="button"], button');
    for (const b of btns) {
      if (/DivSkip/.test(b.getAttribute("class") || "") || b.dataset.e2e === "modal-close-inner-button") return b;
    }
    for (const b of btns) {
      if (b.textContent.trim().toLowerCase() === "skip") return b;
    }
    return null;
  }

  function check() {
    scheduled = false;
    if (!enabled) return;
    if (!document.getElementById(STYLE_ID)) inject();
    const modal = document.getElementById("login-modal");
    if (!modal) {
      // Login modal the user asked for was closed; skip the next one again
      if (modalOpen) allowLogin(false);
      modalOpen = false;
      return;
    }
    modalOpen = true;
    if (document.documentElement.classList.contains(ALLOW_CLASS)) return;
    // TikTok marks the rest of the page inert while the modal is open
    for (const el of document.querySelectorAll("[inert]")) {
      if (!el.contains(modal)) el.removeAttribute("inert");
    }
    const skip = findSkip(modal);
    if (skip && Date.now() - lastClick > 500) {
      lastClick = Date.now();
      skip.click();
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(check);
  }

  // If the user clicks a Log in button themselves, let the modal show
  document.addEventListener("click", (e) => {
    if (!enabled || !e.isTrusted) return;
    const t = e.target.closest && e.target.closest('button, a, [role="button"]');
    if (!t || t.closest("#login-modal")) return;
    const id = (t.id || "") + " " + (t.getAttribute("data-e2e") || "");
    if (/login/i.test(id) || /^log ?in$/i.test(t.textContent.trim())) {
      allowLogin(true);
      // Nothing opened (e.g. it navigated instead) — don't stay disarmed
      setTimeout(() => { if (!modalOpen) allowLogin(false); }, 3000);
    }
  }, true);

  // The modal's focus lock listens for focusin/focusout on document and yanks
  // focus back into the (hidden) modal. Stop those events at <body>, after
  // React's own root/portal listeners have already seen them.
  function blockFocusLock(e) {
    if (!enabled || document.documentElement.classList.contains(ALLOW_CLASS)) return;
    const modal = document.getElementById("login-modal");
    if (!modal || modal.contains(e.target)) return;
    e.stopPropagation();
  }

  function start() {
    enabled = true;
    inject();
    if (!obs) {
      const hook = () => {
        document.body.addEventListener("focusin", blockFocusLock);
        document.body.addEventListener("focusout", blockFocusLock);
      };
      if (document.body) hook();
      else document.addEventListener("DOMContentLoaded", hook, { once: true });
      obs = new MutationObserver(schedule);
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["inert"] });
    }
    schedule();
  }

  function stop() {
    enabled = false;
    if (obs) { obs.disconnect(); obs = null; }
    if (document.body) {
      document.body.removeEventListener("focusin", blockFocusLock);
      document.body.removeEventListener("focusout", blockFocusLock);
    }
    remove();
    allowLogin(false);
  }

  chrome.storage.local.get(["tiktok_enabled"], (data) => {
    if (data.tiktok_enabled !== false) start();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "tiktok_toggle") {
      if (msg.enabled) start();
      else stop();
    }
  });
})();
