// Deine Röhre's rules (README.md), without a window or a disk: reading YouTube links, the day lists and their
// time windows, the daily limit. The page (app.mjs) and the tests (tests/lists.test.mjs) both use this file.
//
// The saved state (lists.json, kept by main.mjs):
//   videos: { [id]: { id, title, channel, added, published } }   every video that is still in a list; a file of
//           Tim's own (README "Eigene Videos") has an id f_<16 hex>, kind 'file', its path in the folder and size
//   inbox:  [id]                                      picked up, not planned yet; nothing in here plays
//   feed:   [id]                                      new uploads of Tim's subscribed channels (Google sign-in),
//                                                     newest first; nothing in here plays either
//   seen:   [id]                                      every upload ever offered in the feed, so a removed one stays away
//   lastCheck: ISO time of the last look at the channels
//   updated: ISO time of the last change on any device (the PC, the phone, the tablet share the lists through Drive)
//   days:   [{ id, name, date, from, to, items: [id], watched: [id] }]
//           a day list plays only on its date between from and to ("HH:MM"; empty = the whole day)
//   music:  [id]                                      plays any time, in order or shuffled, in a loop
//   settings: { perDay, onTop, times }               perDay: how many videos a day list may hold;
//                                                     times: { today: {from, to}, saturday: {from, to} }, the windows
//                                                     the two days get that lay themselves out (planFor)

export const DEFAULT_PER_DAY = 3;
export const FEED_MAX = 300, SEEN_MAX = 5000;
const ID = /^[A-Za-z0-9_-]{11}$/;
const FILE_ID = /^f_[0-9a-f]{16}$/;
export const isFile = (id) => FILE_ID.test(String(id || ''));
const known = (id) => ID.test(id) || FILE_ID.test(id);   // a YouTube video or one of Tim's files

// The video id in one YouTube link (watch, youtu.be, shorts, embed, live, music, mobile) or a bare 11-character id.
export function videoId(text) {
  const s = String(text || '').trim();
  if (ID.test(s)) return s;
  let url;
  try { url = new URL(/^[a-z]+:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(first)) id = second;
  }
  return id && ID.test(id) ? id : null;
}

// Every video id in a pasted text (one link per line, or links inside other text), each once, in order.
export function videoIds(text) {
  const found = [];
  for (const word of String(text || '').split(/[\s<>"'(),]+/)) {
    const id = videoId(word);
    if (id && !found.includes(id)) found.push(id);
  }
  return found;
}

// The playlist in a pasted text: the first YouTube link with a list (playlist?list=…, or a song played inside a list),
// or null. A Mix (an id starting with RD) is YouTube picking songs itself; apps cannot read it (mix: true).
export function playlistIn(text) {
  for (const word of String(text || '').split(/[\s<>"'(),]+/)) {
    let url;
    try { url = new URL(/^[a-z]+:\/\//i.test(word) ? word : 'https://' + word); } catch { continue; }
    const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    const id = url.searchParams.get('list') || '';
    if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && /^[\w-]{2,64}$/.test(id)) return { id, mix: /^RD/.test(id) };
  }
  return null;
}

export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function emptyState() {
  return { updated: '', videos: {}, inbox: [], feed: [], seen: [], lastCheck: '', days: [], music: [], settings: { perDay: DEFAULT_PER_DAY, onTop: false, times: { today: { from: '', to: '' }, saturday: { from: '', to: '' } } } };
}

// A saved file from any version, made whole (missing parts filled in, unknown ids dropped).
export function cleanState(raw) {
  const s = emptyState(), r = raw && typeof raw === 'object' ? raw : {};
  for (const [id, v] of Object.entries(r.videos || {})) {
    if (ID.test(id)) s.videos[id] = { id, title: String(v?.title || ''), channel: String(v?.channel || ''), added: String(v?.added || ''), published: String(v?.published || '') };
    else if (FILE_ID.test(id) && v?.path) s.videos[id] = { id, kind: 'file', title: String(v.title || ''), channel: '', added: String(v.added || ''), published: '', path: String(v.path), size: Number(v.size) || 0 };
  }
  const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => s.videos[id]))];
  s.inbox = ids(r.inbox);
  s.music = ids(r.music);
  s.feed = ids(r.feed);
  s.seen = [...new Set((Array.isArray(r.seen) ? r.seen : []).filter(known))].slice(-SEEN_MAX);
  s.lastCheck = isNaN(Date.parse(r.lastCheck)) ? '' : String(r.lastCheck);
  s.updated = isNaN(Date.parse(r.updated)) ? '' : String(r.updated);
  s.days = (Array.isArray(r.days) ? r.days : []).filter((d) => d && d.id && /^\d{4}-\d{2}-\d{2}$/.test(d.date)).map((d) => ({
    id: String(d.id), name: String(d.name || ''), date: d.date, from: time(d.from), to: time(d.to),
    items: ids(d.items), watched: ids(d.watched),
  }));
  const set = r.settings || {};
  s.settings.perDay = Math.max(1, Math.min(20, Math.round(Number(set.perDay) || DEFAULT_PER_DAY)));
  s.settings.onTop = !!set.onTop;
  for (const k of ['today', 'saturday']) s.settings.times[k] = { from: time(set.times?.[k]?.from), to: time(set.times?.[k]?.to) };
  return s;
}
// Which copy of the lists to keep when two devices meet: the one changed last (a copy never changed counts as oldest).
// Both are whole states; nothing is merged, so a change made on one device while another was offline and changed too
// is lost on the one that changed earlier.
export function newer(local, remote) {
  if (!remote) return 'local';
  const l = Date.parse(local?.updated) || 0, r = Date.parse(remote.updated) || 0;
  return r > l ? 'remote' : 'local';
}

// A device joining the shared lists for the first time: the shared lists win, and the videos only this device had
// are added to their inbox (so a link pasted on the phone before signing in is not lost, nor are the PC's lists).
export function join(local, remote, now = new Date()) {
  const s = cleanState(remote), mine = cleanState(local);
  for (const id of Object.keys(mine.videos)) {
    if (s.videos[id]) continue;
    s.videos[id] = mine.videos[id];
    s.inbox.push(id);
  }
  s.seen = [...new Set([...s.seen, ...mine.seen])].slice(-SEEN_MAX);
  s.updated = now.toISOString();
  return s;
}

const time = (t) => (/^\d{2}:\d{2}$/.test(t || '') ? t : '');

// Local date "YYYY-MM-DD" of a Date.
export function dayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
// The moment a day list opens and closes (local time).
export function windowOf(day) {
  const [y, m, d] = day.date.split('-').map(Number);
  const at = (t, fallback) => { const [h, min] = (t || fallback).split(':').map(Number); return new Date(y, m - 1, d, h, min); };
  const opens = at(day.from, '00:00');
  let closes = day.to ? at(day.to, '00:00') : new Date(y, m - 1, d + 1, 0, 0);
  if (closes <= opens) closes = new Date(y, m - 1, d + 1, 0, 0);   // "to" before "from": open until midnight
  return { opens, closes };
}
// 'waiting' (before it opens), 'open' (its videos play) or 'over'.
export function dayStatus(day, now = new Date()) {
  const { opens, closes } = windowOf(day);
  return now < opens ? 'waiting' : now < closes ? 'open' : 'over';
}

// "in 2 days 3 h", "in 45 min": how long until a moment.
export function untilText(when, now = new Date()) {
  let min = Math.max(0, Math.ceil((when - now) / 60000));
  const d = Math.floor(min / 1440); min -= d * 1440;
  const h = Math.floor(min / 60); min -= h * 60;
  if (d) return `in ${d} ${d === 1 ? 'day' : 'days'}${h ? ` ${h} h` : ''}`;
  if (h) return `in ${h} h${min ? ` ${min} min` : ''}`;
  return `in ${min} min`;
}

// The line under a day list's name: when it plays and how long until then.
export function dayLine(day, now = new Date()) {
  const { opens, closes } = windowOf(day);
  const range = day.from || day.to ? `${day.from || '00:00'}–${day.to || '24:00'}` : 'all day';
  const status = dayStatus(day, now);
  if (status === 'waiting') return `${range}, opens ${untilText(opens, now)}`;
  if (status === 'open') return `${range}, open now, closes ${untilText(closes, now)}`;
  return `${range}, over`;
}

// A day list's default name: the weekday of its date ("Saturday"), or "Today" / "Tomorrow".
export function dayName(date, now = new Date()) {
  const today = dayKey(now), t = new Date(now); t.setDate(t.getDate() + 1);
  if (date === today) return 'Today';
  if (date === dayKey(t)) return 'Tomorrow';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ---- changes: each takes the state and returns a short message when something was refused ----

// New videos into the inbox (ones already in a list are left where they are). Returns the ids that were new.
export function addToInbox(state, ids, info = {}, now = new Date()) {
  const added = [];
  for (const id of ids) {
    if (state.videos[id]) continue;
    state.videos[id] = { id, title: info[id]?.title || '', channel: info[id]?.channel || '', added: now.toISOString() };
    state.inbox.push(id);
    added.push(id);
  }
  return added;
}

export function newDay(state, { date, from = '', to = '', name = '' }, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'Choose a date.' };
  const day = { id: 'd' + now.getTime().toString(36) + state.days.length, name: name.trim(), date, from: time(from), to: time(to), items: [], watched: [] };
  if (dayStatus(day, now) === 'over') return { error: 'That time is already over.' };
  state.days.push(day);
  state.days.sort((a, b) => windowOf(a).opens - windowOf(b).opens);
  return { day };
}

// New uploads from the subscribed channels into the feed, newest first: [{ id, title, channel, published }].
// A video already in a list, or offered before (also one Tim removed), is left out. The oldest fall off past FEED_MAX.
export function addToFeed(state, items, now = new Date()) {
  const added = [];
  for (const v of items) {
    if (!ID.test(v?.id || '') || state.videos[v.id] || state.seen.includes(v.id)) continue;
    state.videos[v.id] = { id: v.id, title: String(v.title || ''), channel: String(v.channel || ''), added: now.toISOString(), published: String(v.published || '') };
    state.feed.push(v.id); state.seen.push(v.id); added.push(v.id);
  }
  const when = (id) => Date.parse(state.videos[id].published) || 0;
  state.feed.sort((a, b) => when(b) - when(a));
  for (const id of state.feed.splice(FEED_MAX)) delete state.videos[id];
  if (state.seen.length > SEEN_MAX) state.seen.splice(0, state.seen.length - SEEN_MAX);
  return added.filter((id) => state.videos[id]);
}

// A file's name as a title: "My.Show.S01E02.1080p.mp4" -> "My Show S01E02".
export function fileTitle(name) {
  return String(name || '').replace(/\.[^.]+$/, '')
    .replace(/[._]+/g, ' ')
    .replace(/\b(1080p|720p|2160p|480p|x264|x265|h264|h265|hevc|web-?dl|webrip|bluray|aac|hdr)\b/gi, '')
    .replace(/\s{2,}/g, ' ').trim() || String(name || '');
}

// Tim's video folder, looked at: [{ id, path, name, size }]. New files go to Pick (the inbox); a file Tim removed
// stays away (seen); a known file keeps its place and gets its current path. Returns the ids that were new.
export function addFiles(state, files, now = new Date()) {
  const added = [];
  for (const f of files) {
    if (!FILE_ID.test(f?.id || '') || !f.path) continue;
    const v = state.videos[f.id];
    if (v) { v.path = String(f.path); v.size = Number(f.size) || 0; continue; }
    if (state.seen.includes(f.id)) continue;
    state.videos[f.id] = { id: f.id, kind: 'file', title: fileTitle(f.name || f.path.split(/[\\/]/).pop()), channel: '', added: now.toISOString(), published: '', path: String(f.path), size: Number(f.size) || 0 };
    state.inbox.push(f.id); state.seen.push(f.id); added.push(f.id);
  }
  return added;
}
// Files no longer in the folder leave every list. Returns how many.
export function dropMissingFiles(state, present) {
  const here = new Set(present);
  const gone = Object.keys(state.videos).filter((id) => FILE_ID.test(id) && !here.has(id));
  for (const id of gone) removeVideo(state, id);
  return gone.length;
}

// A YouTube playlist into Music: [{ id, title, channel }]. New videos are added; ones waiting in the inbox or the feed
// move over; ones planned for a day stay there. Returns how many are in Music now from this playlist.
export function importToMusic(state, items, now = new Date()) {
  let n = 0;
  for (const v of items) {
    if (!ID.test(v?.id || '')) continue;
    const place = placeOf(state, v.id);
    if (place === 'music') { n++; continue; }
    if (place && place !== 'inbox' && place !== 'feed') continue;
    if (!state.videos[v.id]) state.videos[v.id] = { id: v.id, title: String(v.title || ''), channel: String(v.channel || ''), added: now.toISOString(), published: '' };
    takeOut(state, v.id);
    state.music.push(v.id); n++;
  }
  return n;
}

// Where a video is now: 'inbox', 'feed', 'music', a day's id, or null.
export function placeOf(state, id) {
  if (state.inbox.includes(id)) return 'inbox';
  if (state.feed.includes(id)) return 'feed';
  if (state.music.includes(id)) return 'music';
  return state.days.find((d) => d.items.includes(id))?.id || null;
}

function takeOut(state, id) {
  state.inbox = state.inbox.filter((x) => x !== id);
  state.feed = state.feed.filter((x) => x !== id);
  state.music = state.music.filter((x) => x !== id);
  for (const d of state.days) { d.items = d.items.filter((x) => x !== id); d.watched = d.watched.filter((x) => x !== id); }
}

// Move a video to 'inbox', 'music' or a day list. A day list takes at most settings.perDay videos and none once over.
export function moveTo(state, id, target, now = new Date()) {
  if (!state.videos[id]) return { error: 'Unknown video.' };
  if (placeOf(state, id) === target) return {};
  if (target === 'inbox' || target === 'music') { takeOut(state, id); state[target].push(id); return {}; }
  const day = state.days.find((d) => d.id === target);
  if (!day) return { error: 'That list is gone.' };
  if (dayStatus(day, now) === 'over') return { error: `${day.name || dayName(day.date, now)} is over.` };
  if (day.items.length >= state.settings.perDay) return { error: `${day.name || dayName(day.date, now)} is full (${state.settings.perDay} videos a day).` };
  takeOut(state, id);
  day.items.push(id);
  return {};
}

// The Saturday the "Saturday" button means: the next one after today (on a Saturday, "Today" is that one).
export function nextSaturday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return dayKey(d);
}

// One click: a video to 'today', 'saturday' (each day lays itself out with the window from settings.times the first
// time something goes there), 'music', 'inbox', or an existing day's id.
export function planFor(state, id, target, now = new Date()) {
  if (target === 'today' || target === 'saturday') {
    const date = target === 'today' ? dayKey(now) : nextSaturday(now);
    let day = state.days.find((d) => d.date === date);
    if (!day) {
      const r = newDay(state, { date, ...state.settings.times[target] }, now);
      if (r.error) return { error: target === 'today' ? `Today's time is over (until ${state.settings.times.today.to}).` : r.error };
      day = r.day;
    }
    target = day.id;
  }
  return moveTo(state, id, target, now);
}

// Days that are over close by themselves: what was not watched goes back to the inbox. Returns how many went back.
export function tidyDays(state, now = new Date()) {
  let back = 0;
  for (const d of [...state.days]) {
    if (dayStatus(d, now) !== 'over') continue;
    back += d.items.filter((id) => !d.watched.includes(id)).length;
    closeDay(state, d.id);
  }
  return back;
}

// Remove a video completely.
export function removeVideo(state, id) { takeOut(state, id); delete state.videos[id]; }

// A day list goes away; its videos not yet watched go back to the inbox, the watched ones are forgotten.
export function closeDay(state, dayId) {
  const day = state.days.find((d) => d.id === dayId);
  if (!day) return;
  for (const id of day.items) {
    if (day.watched.includes(id)) delete state.videos[id];
    else state.inbox.push(id);
  }
  state.days = state.days.filter((d) => d !== day);
}

export function markWatched(state, dayId, id) {
  const day = state.days.find((d) => d.id === dayId);
  if (day && day.items.includes(id) && !day.watched.includes(id)) day.watched.push(id);
}

// May this video play now? Music always; a day list's video only while its window is open; the inbox and feed never.
export function canPlay(state, id, now = new Date()) {
  const place = placeOf(state, id);
  if (place === 'music') return true;
  if (!place || place === 'inbox' || place === 'feed') return false;
  return dayStatus(state.days.find((d) => d.id === place), now) === 'open';
}

// Music order: as listed, or shuffled (a fresh order that starts with `first` when given).
export function musicOrder(list, shuffle, first = null, random = Math.random) {
  const order = [...list];
  if (shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (first && order.includes(first)) { order.splice(order.indexOf(first), 1); order.unshift(first); }
  return order;
}
