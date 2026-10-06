// Archon Grid design kit, the behaviour half (docs/ARCHON_UI.md). Inlined into the pages by
// archon_grid.ui_js(). No framework; everything is a class on an element.
//   AG.life(emblem)            rare ambient micro-animations on the home emblem (one every 8-20 s)
//   AG.focus(windows)          clicking a window brings it to the front and gives it the focus look
//   AG.draggable(win, handle)  move a window by its header; the frame brightens while dragging
//   AG.success(el)             the restrained success feedback on a piece of text
const AG = (() => {
  const LIFE = ["twitch", "settle", "glow", "breath", "tension"];
  function life(el) {
    if (!el) return;
    let last = -1;
    const tick = () => {
      if (!el.matches(":hover") && document.visibilityState === "visible") {
        let i; do { i = Math.floor(Math.random() * LIFE.length); } while (i === last); last = i;
        const cls = "ag-life-" + LIFE[i];
        el.classList.add(cls); el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
      }
      setTimeout(tick, 8000 + Math.random() * 12000);
    };
    setTimeout(tick, 6000 + Math.random() * 6000);
  }
  let z = 10;
  function focus(windows) {
    const all = Array.from(windows);
    const give = (w) => { for (const o of all) { o.classList.toggle("ag-focus", o === w); o.classList.toggle("ag-inactive", o !== w); } w.style.zIndex = String(++z); };
    for (const w of all) w.addEventListener("pointerdown", () => give(w), { capture: true });
    return give;
  }
  const stored = [];
  function draggable(win, handle, key) {   // key: remember the window's place in localStorage (per page)
    handle = handle || win.querySelector(".ag-head") || win;
    let start = null;
    // A window stays whole on the screen, and sticks to an edge it comes close to (Tim's friend: "sticky to the borders").
    const SNAP = 16, MARGIN = 8;
    const place = (l, t) => {
      const r = win.getBoundingClientRect(), w = r.width || 200, h = r.height || 100;
      const maxL = Math.max(MARGIN, innerWidth - w - MARGIN), maxT = Math.max(MARGIN, innerHeight - h - MARGIN);
      l = Math.max(MARGIN, Math.min(maxL, l)); t = Math.max(MARGIN, Math.min(maxT, t));
      if (l < MARGIN + SNAP) l = MARGIN; else if (l > maxL - SNAP) l = maxL;
      if (t < MARGIN + SNAP) t = MARGIN; else if (t > maxT - SNAP) t = maxT;
      win.style.left = l + "px"; win.style.top = t + "px"; win.style.right = "auto"; win.style.bottom = "auto";
    };
    win._agPlace = place;
    if (key) { stored.push({ win, key }); try { const saved = JSON.parse(localStorage.getItem(key) || "null"); if (saved) requestAnimationFrame(() => place(saved[0], saved[1])); } catch (e) {} }
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button, select, input, textarea, a, table, [data-nodrag]")) return;   // a table inside is for its own clicks and column grips, not for dragging the window
      const r = win.getBoundingClientRect();
      start = { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId };
      win.style.left = r.left + "px"; win.style.top = r.top + "px"; win.style.right = "auto"; win.style.bottom = "auto";
      win.classList.add("ag-dragging"); handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => { if (start) place(e.clientX - start.x, e.clientY - start.y); });
    const end = () => { if (start) { win.classList.remove("ag-dragging"); start = null; if (key) try { localStorage.setItem(key, JSON.stringify([parseFloat(win.style.left), parseFloat(win.style.top)])); } catch (e) {} } };
    handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
  }
  function success(el) {
    if (!el) return;
    el.classList.remove("ag-success"); void el.offsetWidth; el.classList.add("ag-success");
    el.addEventListener("animationend", () => el.classList.remove("ag-success"), { once: true });
  }
  // Cherubim's corners: three tapering feather strokes, ivory to gold, with a soft glow (one SVG per corner, mirrored by CSS).
  const FEATHER = '<defs><linearGradient id="ag-feather-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6efe3"/><stop offset="1" stop-color="#e8b65a"/></linearGradient>'
    + '<filter id="ag-feather-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>'
    + '<g filter="url(#ag-feather-glow)" opacity="0.55"><path d="M4 30 C 6 14, 16 6, 34 4" stroke-width="3.2"/><path d="M4 54 C 4 30, 24 6, 58 4" stroke-width="2"/><path d="M4 72 C 2 40, 30 2, 72 4" stroke-width="1.2"/></g>'
    + '<path d="M4 30 C 6 14, 16 6, 34 4" stroke-width="2.2"/><path d="M4 54 C 4 30, 24 6, 58 4" stroke-width="1.4"/><path d="M4 72 C 2 40, 30 2, 72 4" stroke-width="0.9"/>';
  // Archon's corners: a four-pointed iron star with an ember heart (Tim's reference), one per corner.
  const STAR = '<defs><radialGradient id="ag-star-grad"><stop offset="0" stop-color="#ffb08a"/><stop offset="0.35" stop-color="#ff5a24"/><stop offset="0.6" stop-color="#8a7f78"/><stop offset="1" stop-color="#3a3634"/></radialGradient></defs>'
    + '<path d="M11 0 L13 9 L22 11 L13 13 L11 22 L9 13 L0 11 L9 9 Z"/>';
  function corners(root = document) {   // the other two iron corner pieces of every window (CSS has only two pseudo-elements); feathers for Cherubim's, stars for Archon's
    for (const w of root.querySelectorAll(".ag-window")) {
      if (w.classList.contains("ag-iron")) {
        if (!w.querySelector(":scope > .ag-stars")) for (const c of ["tl", "tr", "bl", "br"]) { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "ag-stars " + c); svg.setAttribute("viewBox", "0 0 22 22"); svg.innerHTML = STAR; w.appendChild(svg); }
      } else if (w.classList.contains("ag-feather")) {
        if (!w.querySelector(":scope > .ag-feathers")) for (const c of ["tl", "tr", "bl", "br"]) { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "ag-feathers " + c); svg.setAttribute("viewBox", "0 0 72 72"); svg.innerHTML = FEATHER; w.appendChild(svg); }
      } else if (!w.querySelector(":scope > .ag-corner")) for (const c of ["ag-tr", "ag-bl"]) { const d = document.createElement("i"); d.className = "ag-corner " + c; w.appendChild(d); }
    }
  }
  if (typeof MutationObserver !== "undefined") new MutationObserver(() => corners()).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== "loading") corners(); else document.addEventListener("DOMContentLoaded", () => corners());
  function resizable(win, key) {   // the right edge, the bottom edge and the corner resize the window; the size is remembered under key
    const sizeKey = key ? key + ":size" : null;
    if (sizeKey) { stored.push({ win, key: sizeKey, size: true }); try { const saved = JSON.parse(localStorage.getItem(sizeKey) || "null"); if (saved) { win.style.width = saved[0] + "px"; win.style.height = saved[1] + "px"; } } catch (e) {} }
    for (const side of ["r", "b", "br"]) {
      const h = document.createElement("div"); h.className = "ag-resize " + side; win.appendChild(h);
      let start = null;
      h.addEventListener("pointerdown", (e) => { e.stopPropagation(); const r = win.getBoundingClientRect(); start = { x: e.clientX, y: e.clientY, w: r.width, hgt: r.height }; h.setPointerCapture(e.pointerId); win.classList.add("ag-resizing"); });
      h.addEventListener("pointermove", (e) => {
        if (!start) return;
        const r = win.getBoundingClientRect();   // never grows past the screen's edge
        if (side !== "b") win.style.width = Math.max(220, Math.min(innerWidth - r.left - 8, start.w + e.clientX - start.x)) + "px";   // never smaller than a title and a line of text
        if (side !== "r") win.style.height = Math.max(120, Math.min(innerHeight - r.top - 8, start.hgt + e.clientY - start.y)) + "px";
        win.style.maxWidth = "none"; win.style.maxHeight = "none";
      });
      const end = () => { if (!start) return; start = null; win.classList.remove("ag-resizing"); if (sizeKey) try { localStorage.setItem(sizeKey, JSON.stringify([parseFloat(win.style.width), parseFloat(win.style.height)])); } catch (e) {} };
      h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
    }
  }
  function closable(win, onClose) {   // a quiet × top right
    const b = document.createElement("button"); b.className = "ag-close"; b.title = "close"; b.setAttribute("aria-label", "close"); b.textContent = "×";
    b.addEventListener("pointerdown", (e) => e.stopPropagation()); b.addEventListener("click", (e) => { e.stopPropagation(); onClose ? onClose() : (win.style.display = "none"); });
    win.appendChild(b); return b;
  }
  // When the screen changes, every placed window is pulled back inside it.
  addEventListener("resize", () => { for (const { win, size } of stored) if (!size && win._agPlace && win.style.left) win._agPlace(parseFloat(win.style.left), parseFloat(win.style.top)); });
  function keepInside(win) { if (!win.style.left) { const r = win.getBoundingClientRect(); if (r.bottom > innerHeight - 8 || r.right > innerWidth - 8) { win._agPlace ? win._agPlace(r.left, r.top) : null; } } }
  function resetWindows() { for (const { win, key, size } of stored) { if (size) { win.style.width = win.style.height = win.style.maxWidth = win.style.maxHeight = ""; } else { win.style.left = win.style.top = win.style.right = win.style.bottom = ""; } try { localStorage.removeItem(key); } catch (e) {} } }
  return { life, focus, draggable, resizable, closable, success, corners, resetWindows, keepInside };
})();
