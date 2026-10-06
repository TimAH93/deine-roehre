// Deine Röhre (README.md): reading YouTube links, the day lists' time windows and limit, what may play.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../app/lists.mjs';

const A = 'dQw4w9WgXcQ', B = 'abcdefghijk', C = 'ABCDEFGHIJK', D = 'a1b2c3d4e5_', E = 'Zz-Zz-Zz-Zz';
const at = (s) => new Date(s);   // local time

test('links: every usual YouTube address gives its id, other text gives none', () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${A}`, `https://youtu.be/${A}?t=42`, `youtube.com/watch?v=${A}&list=PL1`,
    `https://m.youtube.com/watch?v=${A}`, `https://music.youtube.com/watch?v=${A}`, `https://www.youtube.com/shorts/${A}`,
    `https://www.youtube.com/embed/${A}`, `https://www.youtube.com/live/${A}`, A,
  ]) assert.equal(L.videoId(link), A, link);
  for (const no of ['', 'hello', 'https://example.com/watch?v=' + A, 'https://www.youtube.com/@channel', 'https://youtu.be/short']) assert.equal(L.videoId(no), null, no);
  assert.deepEqual(L.videoIds(`look: https://youtu.be/${A}\n(https://www.youtube.com/watch?v=${B}) and youtu.be/${A} again`), [A, B]);
});

test('inbox: new videos only, nothing in the inbox plays', () => {
  const s = L.emptyState();
  assert.deepEqual(L.addToInbox(s, [A, B]), [A, B]);
  assert.deepEqual(L.addToInbox(s, [A, C]), [C]);
  assert.deepEqual(s.inbox, [A, B, C]);
  assert.equal(L.canPlay(s, A), false);
});

test('day list: plays only inside its window, holds at most perDay videos', () => {
  const s = L.emptyState(), now = at('2026-10-06T10:00');
  L.addToInbox(s, [A, B, C, D, E], {}, now);
  const { day } = L.newDay(s, { date: '2026-10-10', from: '14:00', to: '18:00' }, now);
  for (const id of [A, B, C]) assert.deepEqual(L.moveTo(s, id, day.id, now), {});
  assert.match(L.moveTo(s, D, day.id, now).error, /full \(3 videos a day\)/);
  assert.deepEqual(s.inbox, [D, E]);
  assert.equal(L.canPlay(s, A, now), false);
  assert.equal(L.dayStatus(day, now), 'waiting');
  assert.equal(L.dayLine(day, now), '14:00–18:00, opens in 4 days 4 h');
  assert.equal(L.canPlay(s, A, at('2026-10-10T13:59')), false);
  assert.equal(L.canPlay(s, A, at('2026-10-10T14:00')), true);
  assert.equal(L.canPlay(s, A, at('2026-10-10T18:00')), false);
  assert.equal(L.dayStatus(day, at('2026-10-10T18:00')), 'over');
  s.settings.perDay = 4;
  assert.deepEqual(L.moveTo(s, D, day.id, now), {});
  assert.match(L.moveTo(s, E, day.id, at('2026-10-11T09:00')).error, /is over/);
});

test('day list: whole day, "until" before "from" means until midnight, past times are refused', () => {
  const now = at('2026-10-06T10:00');
  assert.equal(L.dayStatus({ date: '2026-10-06', from: '', to: '' }, at('2026-10-06T23:59')), 'open');
  assert.equal(L.dayStatus({ date: '2026-10-06', from: '20:00', to: '02:00' }, at('2026-10-06T23:00')), 'open');
  const s = L.emptyState();
  assert.match(L.newDay(s, { date: '2026-10-05' }, now).error, /over/);
  assert.match(L.newDay(s, { date: '' }, now).error, /date/);
  assert.equal(L.newDay(s, { date: '2026-10-06', to: '09:00', from: '08:00' }, now).error, 'That time is already over.');
});

test('closing a day: unwatched videos go back to the inbox, watched ones are forgotten', () => {
  const s = L.emptyState(), now = at('2026-10-06T10:00');
  L.addToInbox(s, [A, B], {}, now);
  const { day } = L.newDay(s, { date: '2026-10-06' }, now);
  L.moveTo(s, A, day.id, now); L.moveTo(s, B, day.id, now);
  L.markWatched(s, day.id, A);
  L.closeDay(s, day.id);
  assert.deepEqual(s.days, []);
  assert.deepEqual(s.inbox, [B]);
  assert.equal(s.videos[A], undefined);
});

test('music plays any time; shuffle keeps every video once and starts with the chosen one', () => {
  const s = L.emptyState();
  L.addToInbox(s, [A, B, C]);
  for (const id of [A, B, C]) L.moveTo(s, id, 'music');
  assert.equal(L.canPlay(s, B), true);
  assert.deepEqual(L.musicOrder(s.music, false), [A, B, C]);
  const order = L.musicOrder(s.music, true, C, () => 0.3);
  assert.equal(order[0], C);
  assert.deepEqual([...order].sort(), [A, B, C].sort());
});

test('a saved file is made whole: bad ids, unknown videos and bad settings are dropped', () => {
  const s = L.cleanState({
    videos: { [A]: { title: 'One' }, 'bad id': { title: 'x' } },
    inbox: [A, A, B], music: 'no', days: [{ id: 'd1', date: '2026-10-10', from: '25:00x', items: [A, C] }, { id: 'd2', date: 'soon' }],
    settings: { perDay: 99, theme: 'neon', onTop: 1 },
  });
  assert.deepEqual(Object.keys(s.videos), [A]);
  assert.deepEqual(s.inbox, [A]);
  assert.deepEqual(s.music, []);
  assert.equal(s.days.length, 1);
  assert.equal(s.days[0].from, '');
  assert.deepEqual(s.days[0].items, [A]);
  assert.deepEqual(s.settings, { perDay: 20, onTop: true });   // the old theme setting is gone (Archon is black only)
  assert.deepEqual(L.cleanState(null), L.emptyState());
});
