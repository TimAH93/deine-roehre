// Deine Röhre's calls to Google (README.md, "Mit Google anmelden"), shared by the PC app (google.mjs, signed in through
// the browser with a refresh token) and the web app (web/web-api.mjs, signed in with Google's browser sign-in). Each
// side hands in `token()`, an async function that gives a current access token or throws (with signedOut set when the
// sign-in is gone). Only plain fetch, so it runs in Node and in a browser.
//
// What it reads: YouTube (youtube.readonly: subscriptions, uploads, playlists, video titles); what it reads and writes:
// one file, lists.json, in Google Drive's app data folder (drive.appdata), a hidden folder only this app can see.
// That file is how the PC, the iPhone and the tablet share the same lists.

export const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/drive.appdata'];
const YT = 'https://www.googleapis.com/youtube/v3/';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const ID = /^[A-Za-z0-9_-]{11}$/;
const FILE = 'lists.json';

const stop = (text, more = {}) => Object.assign(new Error(text), { stop: true }, more);   // ends a whole look, not just one channel
const timeout = (ms) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

export function makeApi(token) {
  async function call(url, init = {}, what = '') {
    const r = await fetch(url, { ...init, headers: { authorization: 'Bearer ' + await token(), ...(init.headers || {}) }, signal: timeout(20000) });
    if (r.ok) return r.status === 204 ? null : r.json();
    const j = await r.json().catch(() => ({}));
    const reason = j.error?.errors?.[0]?.reason || j.error?.status || '';
    if (r.status === 401) throw stop('The Google sign-in has run out. Sign in again (Settings).', { signedOut: true });
    if (reason === 'quotaExceeded') throw stop('YouTube\'s daily limit for this app is used up. It resets at 9:00 (Google\'s midnight).');
    if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED' || /has not been used|is disabled/.test(j.error?.message || ''))
      throw stop(`Switch on "${url.startsWith(YT) ? 'YouTube Data API v3' : 'Google Drive API'}" in the Google Cloud project (README).`);
    if (r.status === 403 && /insufficient/i.test(reason + ' ' + (j.error?.message || '')))
      throw stop('Deine Röhre needs one more permission (the shared lists). Sign out and sign in again (Settings).', { needsSignIn: true });
    if (r.status === 404 && what === 'playlistItems') return { items: [] };   // a channel without uploads, or a gone playlist
    throw new Error((url.startsWith(YT) ? 'YouTube: ' : 'Google Drive: ') + (j.error?.message || r.status));
  }
  const get = (what, params) => {
    const url = new URL(YT + what);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return call(url.toString(), {}, what);
  };
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
  const usable = (v) => ID.test(v.id || '') && v.title !== 'Private video' && v.title !== 'Deleted video';

  // ---- YouTube ----
  // The channels Tim subscribes to: [{ id, title }].
  async function subscriptions() {
    const items = await all('subscriptions', { mine: 'true', part: 'snippet', order: 'alphabetical' }, 1000);
    return items.map((s) => ({ id: s.snippet?.resourceId?.channelId, title: String(s.snippet?.title || '') })).filter((c) => /^UC[\w-]{22}$/.test(c.id || ''));
  }
  // The newest uploads of these channels since a moment, at most `per` each. A channel's uploads list is its id with
  // UU in place of UC (one call per channel; YouTube's daily allowance is 10,000 calls).
  async function uploads(channels, since, per = 5) {
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
  async function playlists() {
    const mine = await get('channels', { mine: 'true', part: 'contentDetails' });
    const likes = mine.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
    const lists = await all('playlists', { mine: 'true', part: 'snippet,contentDetails' }, 500);
    return [
      ...(likes ? [{ id: likes, title: 'Liked videos', count: null }] : []),
      ...lists.map((p) => ({ id: p.id, title: String(p.snippet?.title || ''), count: p.contentDetails?.itemCount ?? null })),
    ];
  }
  // The videos in one playlist (up to 500), in its order.
  async function playlistVideos(id) {
    if (!/^[\w-]{2,64}$/.test(id)) return [];
    const items = await all('playlistItems', { playlistId: id, part: 'snippet,contentDetails' }, 500);
    return items.map((it) => video(it.snippet, it.contentDetails?.videoId)).filter(usable);
  }
  // Titles and channels: { id: { ok, title, channel } }; ok false for a video that is gone or private.
  async function videoInfo(ids) {
    const out = {};
    ids = ids.filter((id) => ID.test(id));
    for (let i = 0; i < ids.length; i += 50) {
      const part = ids.slice(i, i + 50);
      const j = await get('videos', { id: part.join(','), part: 'snippet,status' });
      for (const id of part) out[id] = { ok: false };
      for (const v of j.items || []) out[v.id] = { ok: v.status?.embeddable !== false, title: String(v.snippet?.title || ''), channel: String(v.snippet?.channelTitle || '') };
    }
    return out;
  }

  // ---- the shared lists in Drive's app data folder ----
  async function fileId() {
    const url = `${DRIVE}?spaces=appDataFolder&fields=files(id,modifiedTime)&q=${encodeURIComponent(`name='${FILE}'`)}`;
    const j = await call(url);
    return j.files?.[0]?.id || null;
  }
  // The saved lists, or null when there are none yet.
  async function driveLoad() {
    const id = await fileId();
    return id ? call(`${DRIVE}/${id}?alt=media`) : null;
  }
  async function driveSave(state) {
    const id = await fileId(), body = JSON.stringify(state);
    if (id) { await call(`${UPLOAD}/${id}?uploadType=media`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body }); return; }
    const b = 'roehre' + Math.random().toString(36).slice(2);
    const multipart = `--${b}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, parents: ['appDataFolder'] })}\r\n`
      + `--${b}\r\ncontent-type: application/json\r\n\r\n${body}\r\n--${b}--`;
    await call(`${UPLOAD}?uploadType=multipart`, { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${b}` }, body: multipart });
  }

  return { subscriptions, uploads, playlists, playlistVideos, videoInfo, driveLoad, driveSave };
}
