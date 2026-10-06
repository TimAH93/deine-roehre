// Deine Röhre's rules (README.md), without a window or a disk: reading YouTube links, the day lists and their
// time windows, the daily limit. The page (app.mjs) and the tests (tests/lists.test.mjs) both use this file.
//
// The saved state (lists.json, kept by main.mjs):
//   videos: { [id]: { id, title, channel, added, published } }   every video that is still in a list
//   inbox:  [id]                                      picked up, not planned yet; nothing in here plays
//   feed:   [id]                                      new uploads of Tim's subscribed channels (Google sign-in),
//                                                     newest first; nothing in here plays either
//   seen:   [id]                                      every upload ever offered in the feed, so a removed one stays away
//   lastCheck: ISO time of the last look at the channels
//   updated: ISO time of the last change on any device (the PC, the phone, the tablet share the lists through Drive)
//   days:   [{ id, name, date, from, to, items: [id], watched: [id] }]
//           a day list plays only on its date between from and to ("HH:MM"; empty = the whole day)
//   music:  [id]                                      plays any time, in order or shuffled, in a loop
//   settings: { perDay, onTop }                      perDay: how many videos a day list may hold

export const DEFAULT_PER_DAY = 3;
export const FEED_MAX = 300, SEEN_MAX = 5000;
const ID = /^[A-Za-z0-9_-]{11}$/;

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

export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function emptyState() {
  return { updated: '', videos: {}, inbox: [], feed: [], seen: [], lastCheck: '', days: [], music: [], settings: { perDay: DEFAULT_PER_DAY, onTop: false } };
}

// A saved file from any version, made whole (missing parts filled in, unknown ids dropped).
export function cleanState(raw) {
  const s = emptyState(), r = raw && typeof raw === 'object' ? raw : {};
  for (const [id, v] of Object.entries(r.videos || {})) {
    if (ID.test(id)) s.videos[id] = { id, title: String(v?.title || ''), channel: String(v?.channel || ''), added: String(v?.added || ''), published: String(v?.published || '') };
  }
  const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => s.videos[id]))];
  s.inbox = ids(r.inbox);
  s.music = ids(r.music);
  s.feed = ids(r.feed);
  s.seen = [...new Set((Array.isArray(r.seen) ? r.seen : []).filter((id) => ID.test(id)))].slice(-SEEN_MAX);
  s.lastCheck = isNaN(Date.parse(r.lastCheck)) ? '' : String(r.lastCheck);
  s.updated = isNaN(Date.parse(r.updated)) ? '' : String(r.updated);
  s.days = (Array.isArray(r.days) ? r.days : []).filter((d) => d && d.id && /^\d{4}-\d{2}-\d{2}$/.test(d.date)).map((d) => ({
    id: String(d.id), name: String(d.name || ''), date: d.date, from: time(d.from), to: time(d.to),
    items: ids(d.items), watched: ids(d.watched),
  }));
  const set = r.settings || {};
  s.settings.perDay = Math.max(1, Math.min(20, Math.round(Number(set.perDay) || DEFAULT_PER_DAY)));
  s.settings.onTop = !!set.onTop;
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
