// ═══════════════════════════════════
//  superlevels: X Reply Auto-Select
//  Auto-selects "Accounts you follow and who they follow"
//  in the "Who can reply?" picker on x.com / twitter.com.
//  Also auto-opens the picker when a post composer mounts.
// ═══════════════════════════════════
(() => {
  const TARGET_TEXT = "Accounts you follow and who they follow";
  const AUDIENCE_PILL_LABELS = new Set([
    "Everyone",
    "Subscribers",
    "Accounts you follow",
    "Accounts you follow and who they follow",
    "Only accounts you mention",
    "Checkmark users",
  ]);
  const COMPOSER_SELECTOR = '[data-testid="tweetTextarea_0"]';

  let _enabled = false;
  let _observer = null;
  let _scheduled = false;
  const _seenGroups = new WeakSet();
  const _openedComposers = new WeakSet();

  function fireClick(el) {
    const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }

  function trySelectInRadiogroup() {
    const groups = document.querySelectorAll('div[role="radiogroup"]');
    for (const group of groups) {
      if (_seenGroups.has(group)) continue;
      let target = null;
      for (const label of group.querySelectorAll("label")) {
        const span = label.querySelector("span");
        if (span && span.textContent.trim() === TARGET_TEXT) {
          target = label;
          break;
        }
      }
      if (!target) continue;
      _seenGroups.add(group);
      const radio = target.querySelector('input[type="radio"]');
      if (!radio || radio.checked) continue;
      fireClick(radio);
    }
  }

  function findComposerRoot(textarea) {
    let node = textarea;
    for (let i = 0; i < 15 && node; i++, node = node.parentElement) {
      if (node.querySelector?.('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')) {
        return node;
      }
    }
    return textarea.closest('[role="dialog"]') || document.body;
  }

  function findAudienceButton(root) {
    const candidates = root.querySelectorAll('button, [role="button"]');
    for (const btn of candidates) {
      const text = btn.textContent?.trim();
      if (!text) continue;
      if (AUDIENCE_PILL_LABELS.has(text)) return btn;
      if (/\bcan reply\b/i.test(text) && text.length < 80) return btn;
    }
    return null;
  }

  function tryOpenComposerPicker() {
    for (const ta of document.querySelectorAll(COMPOSER_SELECTOR)) {
      if (_openedComposers.has(ta)) continue;
      const root = findComposerRoot(ta);
      const btn = findAudienceButton(root);
      if (!btn) continue;
      const text = btn.textContent?.trim();
      if (text === TARGET_TEXT || /^accounts you follow and who they follow/i.test(text || "")) {
        _openedComposers.add(ta);
        continue;
      }
      _openedComposers.add(ta);
      fireClick(btn);
    }
  }

  function tick() {
    tryOpenComposerPicker();
    trySelectInRadiogroup();
  }

  // Batch many DOM mutations into a single tick per animation frame so
  // x.com's constant churn doesn't peg the renderer.
  function scheduleTick() {
    if (_scheduled) return;
    _scheduled = true;
    requestAnimationFrame(() => {
      _scheduled = false;
      if (_enabled) tick();
    });
  }

  function start() {
    if (_observer) return;
    scheduleTick();
    _observer = new MutationObserver(scheduleTick);
    const root = document.body || document.documentElement;
    _observer.observe(root, { childList: true, subtree: true });
  }

  function stop() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    _scheduled = false;
  }

  chrome.storage.local.get(["xreply_enabled"], (data) => {
    _enabled = data.xreply_enabled !== false;
    if (_enabled) start();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "xreply_toggle") {
      _enabled = msg.enabled;
      if (_enabled) start(); else stop();
    }
  });
})();
