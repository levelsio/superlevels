// Full-page screenshot: opened by the popup as a background tab with ?tab=<id>&kind=png|pdf.
// It captures the source tab through the Chrome DevTools Protocol (chrome.debugger) while that
// tab is still in front, then brings itself forward, shows the result and saves it.
const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tab"));
const kind = params.get("kind") === "pdf" ? "pdf" : "png";
// element=1: capture only the element the picker marked with data-sl-shot="pick"
const elementMode = params.get("element") === "1";

const statusEl = document.getElementById("status");
const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const previewEl = document.getElementById("preview");
const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");

// One CDP capture is only reliable up to ~16384 device px tall (beyond that Chrome repeats
// tiles without an error), so the page is captured in slices and stitched. Slices are as tall
// as that allows (a few very heavy pages take ~20 s per capture call, so fewer calls is
// faster), but no bigger than SLICE_MAX_PIXELS so each decoded slice stays ~128 MB or less.
const SLICE_DEVICE_PX = 16000;
const SLICE_MAX_PIXELS = 32e6;
// Size budget for the final image. Over it, drop from Retina to 1x, then scale down further.
const MAX_PIXELS = 150e6;

let blob = null;
let fileName = "";

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = "status" + (cls ? " " + cls : "");
}

// "Large language model - Wikipedia 2026-11-22 14.05.png" (no characters file systems dislike)
function makeFileName(title, ext) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
  const clean = (title || "page").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  return `${clean || "page"} ${stamp}.${ext}`;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function save() {
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// ── Minimal streaming PNG encoder (RGB, 8-bit) ──
// Canvas can't hold a very tall page, so slices are decoded one at a time and their rows
// are streamed through CompressionStream("deflate") (zlib format, as PNG requires).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(parts) {
  let c = 0xffffffff;
  for (const b of parts) for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const head = new Uint8Array(8);
  const view = new DataView(head.buffer);
  view.setUint32(0, data.length);
  head.set(new TextEncoder().encode(type), 4);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32([head.subarray(4), data]));
  return [head, data, crc];
}

class PngStream {
  constructor(width) {
    this.width = width;
    this.height = 0;
    const cs = new CompressionStream("deflate");
    this.writer = cs.writable.getWriter();
    this.out = [];
    const reader = cs.readable.getReader();
    this.pump = (async () => {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        this.out.push(value);
      }
    })();
  }

  // rgba: Uint8ClampedArray of `rows` rows, `this.width` pixels each. Rows use the PNG "Sub" filter.
  async addRows(rgba, rows) {
    const w = this.width;
    const stride = 1 + w * 3;
    const batch = 256;
    for (let y0 = 0; y0 < rows; y0 += batch) {
      const n = Math.min(batch, rows - y0);
      const buf = new Uint8Array(n * stride);
      for (let r = 0; r < n; r++) {
        const src = (y0 + r) * w * 4;
        let o = r * stride;
        buf[o++] = 1; // Sub filter
        let pr = 0, pg = 0, pb = 0;
        for (let x = 0; x < w; x++) {
          const i = src + x * 4;
          const R = rgba[i], G = rgba[i + 1], B = rgba[i + 2];
          buf[o++] = (R - pr) & 255;
          buf[o++] = (G - pg) & 255;
          buf[o++] = (B - pb) & 255;
          pr = R; pg = G; pb = B;
        }
      }
      await this.writer.write(buf);
    }
    this.height += rows;
  }

  async finish() {
    await this.writer.close();
    await this.pump;
    const ihdr = new Uint8Array(13);
    const v = new DataView(ihdr.buffer);
    v.setUint32(0, this.width);
    v.setUint32(4, this.height);
    ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB, deflate, adaptive filtering, no interlace
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...pngChunk("IHDR", ihdr)];
    for (const piece of this.out) parts.push(...pngChunk("IDAT", piece));
    parts.push(...pngChunk("IEND", new Uint8Array(0)));
    return new Blob(parts, { type: "image/png" });
  }
}

// ── Page preparation (runs inside the page) ──
// 1. Some sites scroll inside a full-height panel instead of the page itself; the capture
//    would only see one screen. Let that panel and its ancestors grow to their full height.
// 2. Scroll through once so lazy-loaded images and sections load, wait briefly for images,
//    then go back to the top. Everything is undone by RESTORE_PAGE afterwards.
const PREPARE_PAGE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const saved = { x: scrollX, y: scrollY, styles: [], scroller: null, scrollerTop: 0 };
  window.__slShotRestore = saved;
  const doc = document.scrollingElement || document.documentElement;

  let scroller = null;
  if (doc.scrollHeight <= innerHeight + 2) {
    let bestH = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (el.scrollHeight <= el.clientHeight + 2 || el.scrollHeight <= bestH) continue;
      if (!/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < innerWidth * 0.5 || r.height < innerHeight * 0.5) continue;
      scroller = el; bestH = el.scrollHeight;
    }
  }

  const scrollBox = scroller || window;
  const fullH = () => (scroller ? scroller.scrollHeight : doc.scrollHeight);
  const go = (y) => (scroller ? (scroller.scrollTop = y) : scrollTo(0, y));
  if (scroller) { saved.scroller = scroller; saved.scrollerTop = scroller.scrollTop; }

  const step = Math.max(200, (scroller ? scroller.clientHeight : innerHeight) * 0.9);
  const limit = Math.min(fullH(), 100000);
  for (let y = 0; y < limit; y += step) { go(y); await sleep(100); }
  go(fullH());
  await sleep(300);
  const pending = [...document.images].filter((img) => !img.complete);
  await Promise.race([
    Promise.all(pending.map((img) => new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }))),
    sleep(3000),
  ]);
  go(0);

  if (scroller) {
    for (let el = scroller; el; el = el.parentElement) {
      saved.styles.push([el, el.getAttribute("style")]);
      el.style.setProperty("height", "auto", "important");
      el.style.setProperty("max-height", "none", "important");
      el.style.setProperty("overflow", "visible", "important");
    }
  }
  scrollTo(0, 0);
  await sleep(400);
  return { innerPanel: !!scroller };
})()`;

// Finds the element the picker marked, returns its box in page (document) coordinates
// and removes the mark. Then scrolls to the top (put back by RESTORE_PAGE): when the page
// is left scrolled, Chrome can repeat tiles for the part of the clip below the screen.
const ELEMENT_BOX = `(async () => {
  const el = document.querySelector('[data-sl-shot="pick"]');
  if (!el) return null;
  el.removeAttribute("data-sl-shot");
  const r = el.getBoundingClientRect();
  const x = Math.max(0, Math.floor(r.left + scrollX)), y = Math.max(0, Math.floor(r.top + scrollY));
  const box = { x, y, width: Math.ceil(r.right + scrollX) - x, height: Math.ceil(r.bottom + scrollY) - y };
  window.__slShotRestore = { x: scrollX, y: scrollY, styles: [], scroller: null, scrollerTop: 0 };
  scrollTo(0, 0);
  // Same settle time as the full-page path; two animation frames were not enough
  await new Promise((res) => setTimeout(res, 400));
  return box;
})()`;

const RESTORE_PAGE = `(() => {
  const s = window.__slShotRestore;
  if (!s) return;
  for (const [el, style] of s.styles) style === null ? el.removeAttribute("style") : el.setAttribute("style", style);
  if (s.scroller) s.scroller.scrollTop = s.scrollerTop;
  scrollTo(s.x, s.y);
  delete window.__slShotRestore;
})()`;

async function capture() {
  if (!tabId) throw new Error("No tab to capture.");
  const tab = await chrome.tabs.get(tabId);
  titleEl.textContent = tab.title || tab.url;
  if (!/^(https?|file):/.test(tab.url || "")) {
    throw new Error("Chrome doesn't allow capturing this kind of page. Open a normal website tab.");
  }
  fileName = makeFileName(elementMode ? `${tab.title || "page"} (part)` : tab.title, kind);

  const target = { tabId };
  const send = (method, args) => chrome.debugger.sendCommand(target, method, args);
  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (e) {
    throw new Error(`Couldn't attach to the page: ${e.message}`);
  }

  try {
    let region = null;
    if (elementMode) {
      // No lazy-load pass or panel unlocking: those could move the element
      region = (await send("Runtime.evaluate", { expression: ELEMENT_BOX, awaitPromise: true, returnByValue: true })).result.value;
      if (!region || region.width < 1 || region.height < 1) throw new Error("The picked element is gone or has no size.");
    } else {
      setStatus("Loading the whole page…");
      await send("Runtime.evaluate", { expression: PREPARE_PAGE, awaitPromise: true, returnByValue: true });
    }

    if (kind === "pdf") {
      setStatus("Making the PDF…");
      const { data } = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
      blob = new Blob([b64ToBytes(data)], { type: "application/pdf" });
      return {};
    }

    if (!region) {
      const metrics = await send("Page.getLayoutMetrics");
      const size = metrics.cssContentSize || metrics.contentSize;
      region = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height) };
    }
    const cssW = region.width;
    const cssH = region.height;
    const dpr = (await send("Runtime.evaluate", { expression: "devicePixelRatio", returnByValue: true })).result.value || 1;

    // Retina sharpness unless the image would be huge; then 1x; then smaller still
    let scale = 1;
    const pixels = (s) => cssW * cssH * (dpr * s) ** 2;
    if (pixels(scale) > MAX_PIXELS && dpr > 1) scale = 1 / dpr;
    if (pixels(scale) > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (cssW * cssH * dpr * dpr));
    const outW = Math.round(cssW * dpr * scale);

    const sliceRows = Math.min(SLICE_DEVICE_PX, Math.floor(SLICE_MAX_PIXELS / outW));
    const sliceCss = Math.max(1, Math.floor(sliceRows / (dpr * scale)));
    const slices = Math.ceil(cssH / sliceCss);
    let png = null;
    for (let i = 0; i < slices; i++) {
      setStatus(slices > 1 ? `Capturing part ${i + 1} of ${slices}…` : "Capturing…");
      const y = i * sliceCss;
      const h = Math.min(sliceCss, cssH - y);
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: region.x, y: region.y + y, width: cssW, height: h, scale },
      });
      const bmp = await createImageBitmap(new Blob([b64ToBytes(data)], { type: "image/png" }));
      if (!png) png = new PngStream(outW);
      // Every slice should have the same width; draw to the shared width in case of rounding
      const rows = bmp.height;
      const canvas = new OffscreenCanvas(outW, rows);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, outW, rows);
      bmp.close();
      await png.addRows(ctx.getImageData(0, 0, outW, rows).data, rows);
    }
    setStatus("Saving…");
    blob = await png.finish();
    // Below 1 image pixel per CSS pixel = smaller than the page looks on a normal screen
    return { outW, outH: png.height, scaledBelow1x: dpr * scale < 1 - 1e-9 };
  } finally {
    await send("Runtime.evaluate", { expression: RESTORE_PAGE }).catch(() => {});
    await chrome.debugger.detach(target).catch(() => {});
  }
}

(async () => {
  try {
    const info = await capture();
    const self = await chrome.tabs.getCurrent();
    if (self) await chrome.tabs.update(self.id, { active: true });

    const url = URL.createObjectURL(blob);
    const mb = (blob.size / 1048576).toFixed(1);
    if (kind === "pdf") {
      previewEl.innerHTML = `<iframe src="${url}" title="PDF preview"></iframe>`;
      metaEl.textContent = `PDF · ${mb} MB`;
      saveBtn.textContent = "Save PDF";
      copyBtn.hidden = true;
    } else {
      previewEl.innerHTML = `<img src="${url}" alt="Full-page screenshot">`;
      metaEl.textContent = `${info.outW} × ${info.outH} px · ${mb} MB` +
        (info.scaledBelow1x ? " · scaled down because the page is extremely long" : "");
    }
    document.title = "📸 " + fileName;
    saveBtn.disabled = false;
    copyBtn.disabled = false;
    save();
    setStatus(`Saved to your Downloads as “${fileName}”`, "ok");
  } catch (e) {
    setStatus(e.message || String(e), "err");
    const self = await chrome.tabs.getCurrent().catch(() => null);
    if (self) chrome.tabs.update(self.id, { active: true }).catch(() => {});
  }
})();

saveBtn.addEventListener("click", save);
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    copyBtn.textContent = "Copied!";
  } catch (e) {
    copyBtn.textContent = "Copy failed";
  }
  setTimeout(() => (copyBtn.textContent = "Copy image"), 1500);
});
