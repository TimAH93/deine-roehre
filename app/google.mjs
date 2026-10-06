// Deine Röhre's Google sign-in and the YouTube calls it makes (README.md, "Mit Google anmelden"). Read only: the scope
// is youtube.readonly; nothing on Tim's account is ever changed.
//
// Sign-in is Google's flow for desktop programs: the browser opens Google's own page (Google does not allow sign-in
// inside an app's window), Google sends the answer back to a one-time address on 127.0.0.1, PKCE proves it is ours.
// The client file is the "Desktop app" OAuth client Tim downloads from his own Google Cloud project; it is copied to
// google-client.json in the user-data folder (never into Git). The refresh token is kept in google-token.bin,
// encrypted with Windows' own protection (Electron safeStorage), so only Tim's Windows account can read it.
import { app, shell, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const API = 'https://www.googleapis.com/youtube/v3/';
const ID = /^[A-Za-z0-9_-]{11}$/;
const clientFile = () => path.join(app.getPath('userData'), 'google-client.json');
const tokenFile = () => path.join(app.getPath('userData'), 'google-token.bin');

let access = null;   // { token, until } in memory only

async function readClient() {
  try {
    const j = JSON.parse(await fs.readFile(clientFile(), 'utf8'));
    const c = j.installed || j.web || j;
    return c.client_id && c.client_secret ? { id: c.client_id, secret: c.client_secret } : null;
  } catch { return null; }
}
// The downloaded file, checked and copied in. Returns an error text or null.
export async function setClient(file) {
  let j;
  try { j = JSON.parse(await fs.readFile(file, 'utf8')); } catch { return 'That file is not a Google client file (JSON).'; }
  if (!j.installed) return j.web ? 'That client is a "Web application". Create one of type "Desktop app".' : 'That file is not a Google OAuth client file.';
  if (!j.installed.client_id || !j.installed.client_secret) return 'The client file has no client id or secret.';
  await fs.mkdir(path.dirname(clientFile()), { recursive: true });
  await fs.writeFile(clientFile(), JSON.stringify({ installed: { client_id: j.installed.client_id, client_secret: j.installed.client_secret } }));
  return null;
}

async function readRefresh() {
  try {
    const raw = await fs.readFile(tokenFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : null;
  } catch { return null; }
}
async function writeRefresh(token) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows cannot protect the sign-in here, so it is not kept.');
  await fs.writeFile(tokenFile(), safeStorage.encryptString(token));
}

export async function status() {
  const client = await readClient();
  return { configured: !!client, signedIn: !!client && !!(await readRefresh()) };
}

// The browser opens Google's page; resolves once Google has answered (or after five minutes).
export async function signIn() {
  const client = await readClient();
  if (!client) throw new Error('Choose the client file first.');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  let done;
  const answer = new Promise((resolve, reject) => { done = { resolve, reject }; });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/') { res.writeHead(404).end(); return; }
    const ok = url.searchParams.get('state') === state && url.searchParams.get('code');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(`<!doctype html><meta charset="utf-8"><title>Deine Röhre</title>
<body style="background:#040303;color:#f5f5f5;font:15px Segoe UI,system-ui,sans-serif;display:grid;place-items:center;height:90vh">
<p>${ok ? 'Signed in. You can close this tab and go back to Deine Röhre.' : 'Sign-in did not work. Close this tab and try again in Deine Röhre.'}</p>`);
    if (ok) done.resolve(url.searchParams.get('code'));
    else done.reject(new Error(url.searchParams.get('error') === 'access_denied' ? 'Sign-in was cancelled.' : 'Google did not confirm the sign-in.'));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const timer = setTimeout(() => done.reject(new Error('No answer from Google within five minutes.')), 5 * 60 * 1000);
  try {
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    for (const [k, v] of Object.entries({ client_id: client.id, redirect_uri: redirect, response_type: 'code', scope: SCOPE,
      code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent', state })) auth.searchParams.set(k, v);
    await shell.openExternal(auth.toString());
    const code = await answer;
    const t = await tokenCall({ code, client_id: client.id, client_secret: client.secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier });
    if (!t.refresh_token) throw new Error('Google sent no lasting sign-in. Remove the app at myaccount.google.com, Security, Third-party access, and sign in again.');
    await writeRefresh(t.refresh_token);
    access = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 };
  } finally { clearTimeout(timer); server.close(); }
}

export async function signOut() {
  const refresh = await readRefresh();
  access = null;
  await fs.rm(tokenFile(), { force: true });
  if (refresh) try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(refresh), { method: 'POST', signal: AbortSignal.timeout(8000) }); } catch { /* offline: the key is gone from this PC anyway */ }
}

async function tokenCall(form) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error === 'invalid_grant' ? 'The Google sign-in has run out. Sign in again (Settings).' : 'Google refused: ' + (j.error_description || j.error || r.status));
    e.signedOut = j.error === 'invalid_grant';
    throw e;
  }
  return j;
}
async function token() {
  if (access && Date.now() < access.until) return access.token;
  const client = await readClient(), refresh = await readRefresh();
  if (!client || !refresh) { const e = new Error('Not signed in.'); e.signedOut = true; throw e; }
  try {
    const t = await tokenCall({ client_id: client.id, client_secret: client.secret, refresh_token: refresh, grant_type: 'refresh_token' });
    access = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 };
    return access.token;
  } catch (e) { if (e.signedOut) await fs.rm(tokenFile(), { force: true }); throw e; }
}
async function get(what, params) {
  const url = new URL(API + what);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + await token() }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const reason = j.error?.errors?.[0]?.reason || '';
    const stop = (text) => Object.assign(new Error(text), { stop: true });   // ends a whole look, not just one channel
    if (reason === 'quotaExceeded') throw stop('YouTube\'s daily limit for this app is used up. It resets at 9:00 (Google\'s midnight).');
    if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED') throw stop('Switch on "YouTube Data API v3" in the Google Cloud project (README).');
    if (r.status === 401) throw Object.assign(stop('The Google sign-in has run out. Sign in again (Settings).'), { signedOut: true });
    if (r.status === 404 && what === 'playlistItems') return { items: [] };   // a channel without uploads, or a gone playlist
    throw new Error('YouTube: ' + (j.error?.message || r.status));
  }
  return j;
}
// Every page of a list, up to `max` items.
async function all(what, params, max) {
  const items = [];
  let pageToken = '';
  do {
    const j = await get(what, { ...params, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    items.push(...(j.items || []));
    pageToken = j.nextPageToken || '';
  } while (pageToken && items.length < max);
  return items.slice(0, max);
}
const video = (sn, id) => ({ id, title: String(sn?.title || ''), channel: String(sn?.videoOwnerChannelTitle || sn?.channelTitle || ''), published: String(sn?.publishedAt || '') });
const usable = (v) => ID.test(v.id) && v.title !== 'Private video' && v.title !== 'Deleted video';

// The channels Tim subscribes to: [{ id, title }].
export async function subscriptions() {
  const items = await all('subscriptions', { mine: 'true', part: 'snippet', order: 'alphabetical' }, 1000);
  return items.map((s) => ({ id: s.snippet?.resourceId?.channelId, title: String(s.snippet?.title || '') })).filter((c) => /^UC[\w-]{22}$/.test(c.id || ''));
}
// The newest uploads of these channels since a moment, at most `per` each. A channel's uploads list is its id with
// UU in place of UC (one call per channel; YouTube's daily allowance is 10,000 calls).
export async function uploads(channels, since, per = 5) {
  const after = Date.parse(since) || 0, out = [];
  for (let i = 0; i < channels.length; i += 8) {   // eight at a time
    await Promise.all(channels.slice(i, i + 8).map(async (c) => {
      let j;
      try { j = await get('playlistItems', { playlistId: 'UU' + c.id.slice(2), part: 'snippet,contentDetails', maxResults: String(per) }); }
      catch (e) { if (e.stop || e.signedOut) throw e; return; }   // one channel that cannot be read is skipped
      for (const it of j.items || []) {
        const v = video(it.snippet, it.contentDetails?.videoId);
        v.published = String(it.contentDetails?.videoPublishedAt || v.published);
        if (usable(v) && Date.parse(v.published) > after) out.push({ ...v, channel: v.channel || c.title });
      }
    }));
  }
  return out;
}
// Tim's own playlists and his liked videos: [{ id, title, count }].
export async function playlists() {
  const mine = await get('channels', { mine: 'true', part: 'contentDetails' });
  const likes = mine.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
  const lists = await all('playlists', { mine: 'true', part: 'snippet,contentDetails' }, 500);
  return [
    ...(likes ? [{ id: likes, title: 'Liked videos', count: null }] : []),
    ...lists.map((p) => ({ id: p.id, title: String(p.snippet?.title || ''), count: p.contentDetails?.itemCount ?? null })),
  ];
}
// The videos in one playlist (up to 500), in its order.
export async function playlistVideos(id) {
  if (!/^[\w-]{2,64}$/.test(id)) return [];
  const items = await all('playlistItems', { playlistId: id, part: 'snippet,contentDetails' }, 500);
  return items.map((it) => video(it.snippet, it.contentDetails?.videoId)).filter(usable);
}
