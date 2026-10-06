// Deine Röhre in a browser (the iPhone, the Android tablet; README.md "Auf dem Handy"): the same bridge the PC app gets
// from preload.cjs, made of what a web page has. Lists: the browser's own storage, and the shared file in Google Drive
// (google-api.mjs). Sign-in: Google's sign-in for web pages (Google Identity Services); it gives an access token for
// an hour at a time, so on the web Google may ask again later (one tap). No PC-only parts: no window in front, no mini
// player, no media keys.
import { makeApi, SCOPES } from './google-api.mjs';
import { watchUrl } from './lists.mjs';

const LISTS = 'roehre:lists', CLIENT = 'roehre:clientId', WANTS = 'roehre:google', TOKEN = 'roehre:token';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// The page as an app on the home screen: its manifest and icon, and a small offline helper (sw.js).
for (const [rel, href] of [['manifest', 'manifest.webmanifest'], ['apple-touch-icon', 'icon-192.png']]) {
  const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.append(l);
}
for (const [name, content] of [['theme-color', '#040303'], ['apple-mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-status-bar-style', 'black']]) {
  const m = document.createElement('meta'); m.name = name; m.content = content; document.head.append(m);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* fine without */ });

// The web client's id: from config.json next to the page (Tim's, committed: a client id is not a secret), else typed in.
let configId = '';
try { const r = await fetch('config.json', { cache: 'no-store' }); if (r.ok) configId = String((await r.json()).googleClientId || ''); } catch { /* none */ }
const clientId = () => store.get(CLIENT) || configId;

// ---- Google's sign-in for web pages ----
let gis = null;
function loadGis() {
  if (gis) return gis;
  gis = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve(window.google.accounts.oauth2);
    s.onerror = () => { gis = null; reject(new Error('Google\'s sign-in could not be loaded (offline?).')); };
    document.head.append(s);
  });
  return gis;
}
// Ask Google for a token. Silent when Tim agreed before; Google may still show its window (a tap on a button helps
// the browser allow it).
async function ask(prompt) {
  const oauth2 = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId(), scope: SCOPES.join(' '), prompt,
      callback: (t) => {
        if (t.error) { reject(new Error(t.error === 'access_denied' ? 'Sign-in was cancelled.' : 'Google refused: ' + t.error)); return; }
        if (!SCOPES.every((sc) => oauth2.hasGrantedAllScopes(t, sc))) { reject(new Error('Please allow both: YouTube (read) and the lists in Drive.')); return; }
        const until = Date.now() + (Number(t.expires_in) - 60) * 1000;
        store.set(TOKEN, JSON.stringify({ token: t.access_token, until }));
        resolve(t.access_token);
      },
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Sign-in was closed.' : 'Google\'s sign-in window could not open. Tap "Sign in with Google" (Settings).')),
    });
    client.requestAccessToken();
  });
}
async function token() {
  try { const t = JSON.parse(store.get(TOKEN) || 'null'); if (t && Date.now() < t.until) return t.token; } catch { /* none */ }
  if (store.get(WANTS) !== '1') throw Object.assign(new Error('Not signed in.'), { signedOut: true });
  try { return await ask(''); }
  catch { store.set(WANTS, null); throw Object.assign(new Error('Google wants you to sign in again (Settings, one tap).'), { signedOut: true }); }
}
const g = makeApi(token);
const answer = (fn) => async (...args) => {
  try { return { ok: true, value: await fn(...args) }; }
  catch (e) { return { ok: false, error: String(e.message || e), signedOut: !!e.signedOut }; }
};

// Titles without signing in: YouTube's public oEmbed address.
async function oembed(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`);
    if (!r.ok) return { ok: false };
    const j = await r.json();
    return { ok: true, title: String(j.title || ''), channel: String(j.author_name || '') };
  } catch { return { ok: null }; }
}

export const api = {
  desktop: false,
  load: async () => { try { return JSON.parse(store.get(LISTS) || 'null'); } catch { return null; } },
  save: async (state) => store.set(LISTS, JSON.stringify(state)),
  info: async (ids) => {
    if (store.get(WANTS) === '1') { const r = await answer(() => g.videoInfo(ids))(); if (r.ok) return r.value; }
    return Object.fromEntries(await Promise.all(ids.slice(0, 50).map(async (id) => [id, await oembed(id)])));
  },
  onTop: () => {}, mini: () => {}, onKey: () => {},
  youtube: (id) => window.open(watchUrl(id), '_blank', 'noopener'),
  google: {
    status: answer(async () => ({ configured: !!clientId(), signedIn: !!clientId() && store.get(WANTS) === '1' })),
    chooseClient: answer(async () => {
      const id = (prompt('The client ID of the web client (Google Cloud, Clients; ends with .apps.googleusercontent.com):', clientId()) || '').trim();
      if (!id) return null;
      if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) throw new Error('That is not a Google client ID (it ends with .apps.googleusercontent.com).');
      store.set(CLIENT, id === configId ? null : id);
      return true;
    }),
    signIn: answer(async () => { if (!clientId()) throw new Error('Enter the client ID first.'); await ask('consent'); store.set(WANTS, '1'); return true; }),
    signOut: answer(async () => {
      const t = JSON.parse(store.get(TOKEN) || 'null');
      store.set(TOKEN, null); store.set(WANTS, null);
      if (t?.token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.token, () => {});
    }),
    feed: answer(async (since) => g.uploads(await g.subscriptions(), String(since || ''))),
    playlists: answer(() => g.playlists()),
    playlist: answer((id) => g.playlistVideos(String(id || ''))),
    driveLoad: answer(() => g.driveLoad()),
    driveSave: answer((state) => g.driveSave(state)),
  },
};
