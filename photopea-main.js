// ═══════════════════════════════════
//  superlevels: Photopea No Ads (MAIN world)
//  Registered dynamically by background.js only while the feature is on.
//
//  Photopea lays out the editor as innerWidth - 320 (the ad column), so we
//  report a window 320px wider and photopea.js hides the column.
//
//  Its tamper check: q = window.___osw (innerWidth captured by an inline
//  script at load); if q == innerWidth it uses screen.width instead; then
//  flags if |innerWidth - q - 320| < 12 and assigns window.innerWidth = q.
//  We pin ___osw far from innerWidth so the check never fires, and give
//  innerWidth a no-op setter so that assignment is harmless.
// ═══════════════════════════════════
(() => {
  const AD_WIDTH = 320;
  const desc = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const real = () => (desc && desc.get ? desc.get.call(window) : document.documentElement.clientWidth);
  try {
    Object.defineProperty(window, "innerWidth", {
      get() { return real() + AD_WIDTH; },
      set() {},
      configurable: true,
    });
    Object.defineProperty(window, "___osw", {
      get() { return real() + AD_WIDTH * 2; },
      set() {},
      configurable: true,
    });
  } catch (e) {}
})();
