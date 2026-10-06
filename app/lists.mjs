// Deine Röhre's rules (README.md), without a window or a disk: reading YouTube links, the day lists and their
// time windows, the daily limit. The page (app.mjs) and the tests (tests/lists.test.mjs) both use this file.
//
// The saved state (lists.json, kept by main.mjs):
//   videos: { [id]: { id, title, channel, added } }   every video Tim ever pasted that is still in a list
//   inbox:  [id]                                      picked up, not planned yet; nothing in here plays
//   days:   [{ id, name, date, from, to, items: [id], watched: [id] }]
//           a day list plays only on its date between from and to ("HH:MM"; empty = the whole day)
//   music:  [id]                                      plays any time, in order or shuffled, in a loop
//   settings: { perDay, onTop }                      perDay: how many videos a day list may hold

export const DEFAULT_PER_DAY = 3;
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
  return { videos: {}, inbox: [], days: [], music: [], settings: { perDay: DEFAULT_PER_DAY, onTop: false } };
}

// A saved file from any version, made whole (missing parts filled in, unknown ids dropped).
export function cleanState(raw) {
  const s = emptyState(), r = raw && typeof raw === 'object' ? raw : {};
  for (const [id, v] of Object.entries(r.videos || {})) {
    if (ID.test(id)) s.videos[id] = { id, title: String(v?.title || ''), channel: String(v?.channel || ''), added: String(v?.added || '') };
  }
  const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => s.videos[id]))];
  s.inbox = ids(r.inbox);
  s.music = ids(r.music);
  s.days = (Array.isArray(r.days) ? r.days : []).filter((d) => d && d.id && /^\d{4}-\d{2}-\d{2}$/.test(d.date)).map((d) => ({
    id: String(d.id), name: String(d.name || ''), date: d.date, from: time(d.from), to: time(d.to),
    items: ids(d.items), watched: ids(d.watched),
  }));
  const set = r.settings || {};
  s.settings.perDay = Math.max(1, Math.min(20, Math.round(Number(set.perDay) || DEFAULT_PER_DAY)));
  s.settings.onTop = !!set.onTop;
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

// Where a video is now: 'inbox', 'music', a day's id, or null.
export function placeOf(state, id) {
  if (state.inbox.includes(id)) return 'inbox';
  if (state.music.includes(id)) return 'music';
  return state.days.find((d) => d.items.includes(id))?.id || null;
}

function takeOut(state, id) {
  state.inbox = state.inbox.filter((x) => x !== id);
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

// May this video play now? Music always; a day list's video only while its window is open; the inbox never.
export function canPlay(state, id, now = new Date()) {
  const place = placeOf(state, id);
  if (place === 'music') return true;
  if (!place || place === 'inbox') return false;
  return dayStatus(state.days.find((d) => d.id === place), now) === 'open';
}

// Music order: as listed, or shuffled (a fresh order that starts with `first` when given).
export function musicOrder(list, shuffle, first = null, random = Math.random) {
  const order = [...list];
  if (shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (first && order.includes(first)) { order.splice(order.indexOf(first), 1); order.unshift(first); }
  return order;
}
