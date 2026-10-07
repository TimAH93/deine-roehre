// Deine Röhre on the iPhone at home (README.md "iPhone zu Hause"): the page comes from the PC's home server
// (home.mjs) and this bridge talks to it, in place of Electron (preload.cjs) or Google (web-api.mjs). The lists are
// the PC's own; the PC shares them with Drive when it is signed in. Once per phone: the 6-digit code from the PC's
// Settings gives a key, kept in the browser.
import { watchUrl } from './lists.mjs';

const KEY = 'roehre:homeKey';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } },
};
for (const [name, content] of [['theme-color', '#040303'], ['apple-mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-status-bar-style', 'black']]) {
  const m = document.createElement('meta'); m.name = name; m.content = content; document.head.append(m);
}

// The key, asked for until the code is right.
async function pair() {
  let note = 'Enter the 6-digit code from Deine Röhre on your PC (Settings, "iPhone at home"):';
  for (;;) {
    const code = (prompt(note) || '').trim();
    if (!code) throw new Error('Not paired with the PC.');
    const r = await fetch('/api/pair', { method: 'POST', body: JSON.stringify({ code }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.key) { store.set(KEY, j.key); return j.key; }
    note = (j.error || 'That did not work.') + ' Try again:';
  }
}
// Opened from the PC's QR code (…/#pair=123456): paired with that code at once, and the code taken out of the address
// (so "Add to Home Screen" keeps the plain address). A wrong or old code falls back to asking.
async function pairFromAddress() {
  const code = /^#pair=(\d{6})$/.exec(location.hash)?.[1];
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (store.get(KEY)) return;
  try {
    const r = await fetch('/api/pair', { method: 'POST', body: JSON.stringify({ code }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.key) store.set(KEY, j.key);
  } catch { /* the PC is away: asked for the code below */ }
}
await pairFromAddress();
async function call(url, init = {}) {
  const key = store.get(KEY) || await pair();
  const r = await fetch(url, { ...init, headers: { 'x-roehre-key': key, ...(init.headers || {}) } });
  if (r.status === 401) { store.set(KEY, null); return call(url, init); }   // the PC made a new code: pair again
  if (!r.ok) throw new Error('The PC answered ' + r.status + '.');
  return r.json();
}
const off = (what) => async () => ({ ok: false, error: `${what}: on the PC (here the PC's lists are used).` });

let lastSeen = '', ours = '';
export const api = {
  desktop: false, home: true,
  load: () => call('/api/lists'),
  save: async (state) => {
    ours = state.updated || '';
    try { await call('/api/lists', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) }); }
    catch { /* the PC is off or away: kept in the page until the next change */ }
  },
  info: async (ids) => { try { return await call('/api/info', { method: 'POST', body: JSON.stringify(ids) }); } catch { return {}; } },
  // The PC (or another phone) changed the lists: every few seconds a look at the time of the last change.
  onRemote: (fn) => {
    setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { updated } = await call('/api/updated');
        if (!updated || updated === lastSeen || updated === ours) { lastSeen = updated; return; }
        lastSeen = updated;
        fn(await call('/api/lists'));
      } catch { /* the PC is off: try again */ }
    }, 4000);
  },
  // The PC's player from here (README "Fernbedienung"): what plays there, and its buttons.
  remote: {
    now: () => call('/api/now'),
    control: (command) => call('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) }),
  },
  fileUrl: (id) => `/file/${id}?k=${encodeURIComponent(store.get(KEY) || '')}`,
  onTop: () => {}, mini: () => {}, onKey: () => {}, watching: () => {},
  fullscreen: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); },
  youtube: (id) => window.open(watchUrl(id), '_blank', 'noopener'),
  google: {
    status: async () => ({ ok: true, value: { configured: false, signedIn: false } }),
    chooseClient: off('Google'), signIn: off('Google sign-in'), signOut: off('Google'),
    feed: off('Channels'), playlists: off('Import'), playlist: off('Import'), search: off('Search'), categories: off('Sorting'),
    driveLoad: off('Sharing'), driveSave: off('Sharing'),
  },
};
