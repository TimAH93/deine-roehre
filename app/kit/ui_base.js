// UI base, the behaviour half (docs/UI_BASE.md; styles in Tools/ui_base.css). No framework, no network.
//   UB.theme(name)                 'light' | 'dark' | 'system' | a skin name; remembered; no argument = the remembered one
//   UB.menu(home, items, opts)     home opens the compact menu (one line per item, staggered); an item with
//                                  data-window="id" grows into that window; return / x / Escape shrink it back
//   UB.window(win, {key, onClose}) movable by the header, resizable, closable, front on click; place and size remembered
//   UB.success(el)                 the restrained success feedback on a piece of text
//   UB.reset()                     forget every remembered place and size
const UB = (() => {
  const SVG = "http://www.w3.org/2000/svg";
  const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  const SNAP = 16, MARGIN = 8, MIN_W = 220, MIN_H = 120;
  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  function theme(name) {
    const root = document.documentElement;
    if (name === undefined) name = store.get("ub:theme") || root.dataset.theme || "system";
    else store.set("ub:theme", name);
    if (name === "system") delete root.dataset.theme; else root.dataset.theme = name;
    return name;
  }

  // ---- windows ----
  const wins = [];
  let z = 10;
  function front(win) {
    for (const o of wins) { o.classList.toggle("ub-focus", o === win); o.classList.toggle("ub-inactive", o !== win); }
    win.style.zIndex = String(++z);
  }
  // A window stays whole on the screen and sticks to an edge it comes close to.
  function place(win, l, t) {
    const r = win.getBoundingClientRect(), w = r.width || MIN_W, h = r.height || MIN_H;
    const maxL = Math.max(MARGIN, innerWidth - w - MARGIN), maxT = Math.max(MARGIN, innerHeight - h - MARGIN);
    l = Math.max(MARGIN, Math.min(maxL, l)); t = Math.max(MARGIN, Math.min(maxT, t));
    if (l < MARGIN + SNAP) l = MARGIN; else if (l > maxL - SNAP) l = maxL;
    if (t < MARGIN + SNAP) t = MARGIN; else if (t > maxT - SNAP) t = maxT;
    Object.assign(win.style, { left: l + "px", top: t + "px", right: "auto", bottom: "auto" });
  }
  function keepInside(win) {
    if (win.hidden) return;
    const r = win.getBoundingClientRect();
    if (r.left < MARGIN || r.top < MARGIN || r.right > innerWidth - MARGIN || r.bottom > innerHeight - MARGIN) place(win, r.left, r.top);
  }
  function save(win) {
    const key = win._ub && win._ub.key;
    if (!key) return;
    const s = win.style, v = {};
    if (s.left && s.left !== "auto") { v.l = parseFloat(s.left); v.t = parseFloat(s.top); }
    if (s.width) v.w = parseFloat(s.width);
    if (s.height) v.h = parseFloat(s.height);
    store.set(key, v);
  }
  function makeWindow(win, opts = {}) {
    if (!win || win._ub) return win;
    const key = opts.key || (win.id ? "ub:win:" + win.id : null);
    win._ub = { key, onClose: opts.onClose || null, back: null };
    wins.push(win);
    if (!win.querySelector(":scope > .ub-sweep")) { const s = document.createElement("i"); s.className = "ub-sweep"; win.appendChild(s); }
    const saved = key && store.get(key);
    if (saved) {
      if (saved.w) win.style.width = saved.w + "px";
      if (saved.h) win.style.height = saved.h + "px";
      if (saved.l != null) Object.assign(win.style, { left: saved.l + "px", top: saved.t + "px", right: "auto", bottom: "auto" });
    }
    win.addEventListener("pointerdown", () => front(win), { capture: true });

    // move by the whole header, no visible handle
    const head = win.querySelector(".ub-head") || win;
    let drag = null;
    head.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button, select, input, textarea, a, [data-nodrag]")) return;
      const r = win.getBoundingClientRect();
      drag = { x: e.clientX - r.left, y: e.clientY - r.top };
      Object.assign(win.style, { left: r.left + "px", top: r.top + "px", right: "auto", bottom: "auto" });
      win.classList.add("ub-dragging"); head.setPointerCapture(e.pointerId);
    });
    head.addEventListener("pointermove", (e) => { if (drag) place(win, e.clientX - drag.x, e.clientY - drag.y); });
    const endDrag = () => { if (!drag) return; drag = null; win.classList.remove("ub-dragging"); save(win); };
    head.addEventListener("pointerup", endDrag); head.addEventListener("pointercancel", endDrag);

    // resize by the right edge, the bottom edge and the corner
    for (const side of ["r", "b", "br"]) {
      const h = document.createElement("div"); h.className = "ub-resize " + side; win.appendChild(h);
      let start = null;
      h.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const r = win.getBoundingClientRect();
        start = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
        Object.assign(win.style, { left: r.left + "px", top: r.top + "px", right: "auto", bottom: "auto" });
        h.setPointerCapture(e.pointerId); document.body.classList.add("ub-resizing");
      });
      h.addEventListener("pointermove", (e) => {
        if (!start) return;
        const r = win.getBoundingClientRect();
        if (side !== "b") win.style.width = Math.max(MIN_W, Math.min(innerWidth - r.left - MARGIN, start.w + e.clientX - start.x)) + "px";
        if (side !== "r") win.style.height = Math.max(MIN_H, Math.min(innerHeight - r.top - MARGIN, start.h + e.clientY - start.y)) + "px";
      });
      const end = () => { if (!start) return; start = null; document.body.classList.remove("ub-resizing"); save(win); };
      h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
    }

    // a quiet x top right
    if (opts.closable !== false && !win.querySelector(":scope > .ub-close")) {
      const b = document.createElement("button");
      b.className = "ub-close"; b.type = "button"; b.title = "Close"; b.setAttribute("aria-label", "Close"); b.textContent = "×";
      b.addEventListener("click", (e) => { e.stopPropagation(); close(win); });
      win.appendChild(b);
    }
    if (!win.hidden) requestAnimationFrame(() => keepInside(win));
    return win;
  }
  function close(win) {
    const u = win._ub || {};
    if (u.back) u.back();
    else if (u.onClose) u.onClose(win);
    else win.hidden = true;
  }

  // The window grows out of the rectangle it came from, or shrinks back into it.
  function morph(win, rect, opening, done) {
    if (reduced() || !win.animate) { if (done) done(); return; }
    const w = win.getBoundingClientRect();
    if (!w.width || !w.height) { if (done) done(); return; }
    const from = `translate(${rect.left - w.left}px, ${rect.top - w.top}px) scale(${rect.width / w.width}, ${rect.height / w.height})`;
    win.style.transformOrigin = "0 0";
    win.classList.add("ub-growing");
    if (opening) { void win.offsetWidth; requestAnimationFrame(() => win.classList.remove("ub-growing")); }
    const frames = opening ? [{ transform: from, opacity: 0.5 }, { transform: "none", opacity: 1 }]
                           : [{ transform: "none", opacity: 1 }, { transform: from, opacity: 0 }];
    const a = win.animate(frames, { duration: 300, easing: EASE });
    a.onfinish = a.oncancel = () => { win.style.transformOrigin = ""; if (!opening) win.classList.remove("ub-growing"); if (done) done(); };
  }

  // ---- the menu: home -> compact items -> one item becomes its window -> return ----
  function menu(home, items, opts = {}) {
    items = Array.from(items);
    if (!home || !items.length) return null;
    const root = items[0].closest(".ub-menu") || items[0].parentElement;
    const list = items[0].parentElement;
    let svg = root.querySelector(".ub-lines");
    if (!svg) { svg = document.createElementNS(SVG, "svg"); svg.setAttribute("class", "ub-lines"); svg.setAttribute("aria-hidden", "true"); root.prepend(svg); }
    let open = false, current = null;
    home.setAttribute("aria-expanded", "false");

    const layout = () => {
      const h = home.getBoundingClientRect();
      list.style.left = h.right + (opts.gap ?? 56) + "px";
      list.style.top = h.top + "px";
    };
    const drawLines = (animate) => {
      svg.replaceChildren();
      const h = home.getBoundingClientRect(), x0 = h.right, y0 = h.top + h.height / 2;
      for (const it of items) {
        const r = it.getBoundingClientRect(), x1 = r.left, y1 = r.top + r.height / 2, mx = (x0 + x1) / 2;
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d", `M${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`);
        p.setAttribute("class", "ub-line");
        svg.appendChild(p); it._ubLine = p;
        if (animate && !reduced() && p.getTotalLength) { p.style.setProperty("--ub-len", String(Math.ceil(p.getTotalLength()))); p.classList.add("ub-draw"); }
      }
    };
    const stagger = (first, step) => {
      items.forEach((it, i) => {
        it.classList.remove("ub-appear"); void it.offsetWidth;
        it.style.animationDelay = first + i * step + "ms"; it.classList.add("ub-appear");
      });
    };
    for (const it of items) {
      it.addEventListener("pointerenter", () => it._ubLine && it._ubLine.classList.add("ub-lit"));
      it.addEventListener("pointerleave", () => it._ubLine && it._ubLine.classList.remove("ub-lit"));
      it.addEventListener("click", () => expand(it));
      const win = it.dataset.window && document.getElementById(it.dataset.window);
      if (win) { win.hidden = true; makeWindow(win, opts.window || {}); win._ub.back = () => back(); }
    }

    function openMenu() {
      if (open) return;
      open = true; root.classList.add("ub-open"); home.setAttribute("aria-expanded", "true");
      layout(); drawLines(true); stagger(80, 55);
      if (opts.onOpen) opts.onOpen();
    }
    function closeMenu() {
      if (!open) return;
      if (current) back(true);
      open = false; root.classList.remove("ub-open"); home.setAttribute("aria-expanded", "false");
      svg.replaceChildren();
      if (opts.onClose) opts.onClose();
    }
    function expand(it) {
      const win = it.dataset.window && document.getElementById(it.dataset.window);
      if (!win) { if (opts.onPick) opts.onPick(it); return; }
      if (current) return;
      const from = it.getBoundingClientRect();
      current = { it, win };
      for (const o of items) o.classList.remove("ub-appear");   // the appear animation's fill would keep them visible
      root.classList.add("ub-expanded");
      win.hidden = false; keepInside(win); front(win);
      morph(win, from, true);
      const ret = win.querySelector(".ub-return");
      if (ret) ret.focus({ preventScroll: true });
      if (opts.onExpand) opts.onExpand(it, win);
    }
    function back(quiet) {
      if (!current) return;
      const { it, win } = current; current = null;
      const to = it.getBoundingClientRect();
      morph(win, to, false, () => { win.hidden = true; });
      root.classList.remove("ub-expanded");
      if (!quiet) { stagger(120, 45); it.focus({ preventScroll: true }); }
    }
    for (const it of items) {
      const win = it.dataset.window && document.getElementById(it.dataset.window);
      const ret = win && win.querySelector(".ub-return");
      if (ret) ret.addEventListener("click", (e) => { e.stopPropagation(); back(); });
    }

    home.addEventListener("click", () => (open ? closeMenu() : openMenu()));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (current) back(); else if (open) { closeMenu(); home.focus(); }
    });
    // a click on the empty page closes the menu (not while a window is open)
    document.addEventListener("pointerdown", (e) => {
      if (!open || current) return;
      if (e.target.closest(".ub-home, .ub-item, .ub-window")) return;
      if (e.target !== home && !home.contains(e.target)) closeMenu();
    });
    addEventListener("resize", () => { if (open) { layout(); drawLines(false); } });
    return { open: openMenu, close: closeMenu, expand, back, get isOpen() { return open; }, get current() { return current && current.win; } };
  }

  function success(el) {
    if (!el) return;
    el.classList.remove("ub-success"); void el.offsetWidth; el.classList.add("ub-success");
    el.addEventListener("animationend", () => el.classList.remove("ub-success"), { once: true });
  }

  function reset() {
    for (const win of wins) {
      if (win._ub.key) store.del(win._ub.key);
      for (const p of ["left", "top", "right", "bottom", "width", "height"]) win.style[p] = "";
    }
  }

  addEventListener("resize", () => { for (const w of wins) keepInside(w); });
  return { theme, menu, window: makeWindow, close, success, reset, front };
})();
