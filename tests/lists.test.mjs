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
  assert.deepEqual(s.settings, { perDay: 20, onTop: true, times: { today: { from: '', to: '' }, saturday: { from: '', to: '' } } });   // the old theme setting is gone (Archon is black only)
  assert.deepEqual(L.cleanState(null), L.emptyState());
});

test('channel feed: newest first, nothing plays, a removed upload never comes back, capped', () => {
  const s = L.emptyState(), now = at('2026-10-06T10:00');
  const added = L.addToFeed(s, [
    { id: A, title: 'Old', channel: 'One', published: '2026-10-01T10:00:00Z' },
    { id: B, title: 'New', channel: 'Two', published: '2026-10-05T10:00:00Z' },
    { id: 'not an id' },
  ], now);
  assert.deepEqual(added, [A, B]);
  assert.deepEqual(s.feed, [B, A]);
  assert.equal(L.placeOf(s, A), 'feed');
  assert.equal(L.canPlay(s, A, now), false);
  L.removeVideo(s, A);
  assert.deepEqual(L.addToFeed(s, [{ id: A, published: '2026-10-01T10:00:00Z' }], now), []);
  assert.deepEqual(L.moveTo(s, B, 'inbox', now), {});
  assert.deepEqual(s.feed, []);
  assert.deepEqual(L.addToInbox(s, [B]), []);   // already in a list
  const many = Array.from({ length: L.FEED_MAX + 5 }, (_, i) => ({ id: ('v' + String(i).padStart(10, '0')).slice(0, 11), published: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
  L.addToFeed(s, many, now);
  assert.equal(s.feed.length, L.FEED_MAX);
  assert.equal(s.feed[0], many.at(-1).id);           // the newest stays
  assert.equal(s.videos[many[0].id], undefined);     // the oldest fell off
  const again = L.cleanState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.feed, s.feed);
  assert.ok(again.seen.includes(A));
});

test('playlist into Music: new ones added, inbox and feed ones move, planned ones stay', () => {
  const s = L.emptyState(), now = at('2026-10-06T10:00');
  L.addToInbox(s, [A], {}, now);
  L.addToFeed(s, [{ id: B, published: '2026-10-05T10:00:00Z' }], now);
  L.addToInbox(s, [C], {}, now);
  const { day } = L.newDay(s, { date: '2026-10-10' }, now);
  L.moveTo(s, C, day.id, now);
  assert.equal(L.importToMusic(s, [{ id: A }, { id: B }, { id: C }, { id: D, title: 'Song' }], now), 3);
  assert.deepEqual(s.music, [A, B, D]);
  assert.deepEqual(s.inbox, []);
  assert.deepEqual(s.feed, []);
  assert.equal(L.placeOf(s, C), day.id);
  assert.equal(s.videos[D].title, 'Song');
});

test('sharing between devices: the copy changed last wins, a missing or never-changed one loses', () => {
  const a = L.emptyState(), b = L.emptyState();
  assert.equal(L.newer(a, null), 'local');
  assert.equal(L.newer(a, b), 'local');                        // neither changed: keep what is here
  b.updated = '2026-10-06T12:00:00.000Z';
  assert.equal(L.newer(a, b), 'remote');
  a.updated = '2026-10-06T12:00:01.000Z';
  assert.equal(L.newer(a, b), 'local');
  assert.equal(L.cleanState({ updated: 'soon' }).updated, '');
  assert.equal(L.cleanState(b).updated, b.updated);
});

test('a device joining: the shared lists win, its own extra videos go to their inbox', () => {
  const now = at('2026-10-06T10:00');
  const pc = L.emptyState(), phone = L.emptyState();
  L.addToInbox(pc, [A, B], {}, now);
  L.moveTo(pc, B, 'music', now);
  pc.updated = '2026-10-05T10:00:00.000Z';
  L.addToInbox(phone, [B, C], {}, now);
  phone.updated = now.toISOString();          // newer, but it must not wipe the PC's lists
  const s = L.join(phone, pc, now);
  assert.deepEqual(s.inbox, [A, C]);
  assert.deepEqual(s.music, [B]);
  assert.equal(s.updated, now.toISOString());
});

test('one click: Today and Saturday lay themselves out with the windows from settings', () => {
  const s = L.emptyState(), fri = at('2026-10-09T10:00');      // a Friday
  s.settings.times.saturday = { from: '14:00', to: '20:00' };
  L.addToInbox(s, [A, B, C], {}, fri);
  assert.equal(L.nextSaturday(fri), '2026-10-10');
  assert.equal(L.nextSaturday(at('2026-10-10T10:00')), '2026-10-17');   // on a Saturday: the next one
  assert.deepEqual(L.planFor(s, A, 'today', fri), {});
  assert.deepEqual(L.planFor(s, B, 'saturday', fri), {});
  assert.deepEqual(L.planFor(s, C, 'saturday', fri), {});
  assert.equal(s.days.length, 2);
  const sat = s.days.find((d) => d.date === '2026-10-10');
  assert.deepEqual([sat.from, sat.to, sat.items], ['14:00', '20:00', [B, C]]);
  assert.equal(L.canPlay(s, A, fri), true);                   // today, whole day
  assert.equal(L.canPlay(s, B, fri), false);
  s.settings.times.today = { from: '', to: '09:00' };
  L.closeDay(s, s.days.find((d) => d.date === '2026-10-09').id);
  assert.match(L.planFor(s, A, 'today', fri).error, /Today's time is over \(until 09:00\)/);
  assert.deepEqual(L.cleanState({ settings: { times: { today: { from: '18:00', to: 'x' } } } }).settings.times,
    { today: { from: '18:00', to: '' }, saturday: { from: '', to: '' } });
});

test('days that are over close by themselves; unwatched videos go back', () => {
  const s = L.emptyState(), fri = at('2026-10-09T10:00');
  L.addToInbox(s, [A, B], {}, fri);
  L.planFor(s, A, 'today', fri); L.planFor(s, B, 'today', fri);
  L.markWatched(s, s.days[0].id, A);
  assert.equal(L.tidyDays(s, fri), 0);
  assert.equal(L.tidyDays(s, at('2026-10-10T00:01')), 1);
  assert.deepEqual(s.days, []);
  assert.deepEqual(s.inbox, [B]);
});

test('own files: new ones go to Pick, a removed one stays away, missing ones leave, titles cleaned', () => {
  const s = L.emptyState(), now = at('2026-10-06T10:00');
  const f1 = 'f_0123456789abcdef', f2 = 'f_fedcba9876543210';
  assert.equal(L.fileTitle('My.Show.S01E02.1080p.WEB-DL.mp4'), 'My Show S01E02');
  assert.equal(L.isFile(f1), true);
  assert.equal(L.isFile(A), false);
  assert.deepEqual(L.addFiles(s, [{ id: f1, path: 'Show/My.Show.S01E02.mp4', size: 10 }, { id: f2, path: 'Film.mkv', size: 20 }, { id: 'bad', path: 'x' }], now), [f1, f2]);
  assert.deepEqual(s.inbox, [f1, f2]);
  assert.equal(s.videos[f1].title, 'My Show S01E02');
  assert.deepEqual(L.planFor(s, f1, 'today', now), {});
  assert.equal(L.canPlay(s, f1, now), true);
  L.removeVideo(s, f2);
  assert.deepEqual(L.addFiles(s, [{ id: f2, path: 'Film.mkv' }], now), []);            // removed: stays away
  assert.deepEqual(L.addFiles(s, [{ id: f1, path: 'Moved/My.Show.S01E02.mp4' }], now), []);
  assert.equal(s.videos[f1].path, 'Moved/My.Show.S01E02.mp4');                          // known: new path
  const again = L.cleanState(JSON.parse(JSON.stringify(s)));
  assert.equal(again.videos[f1].kind, 'file');
  assert.equal(L.placeOf(again, f1), again.days[0].id);
  assert.equal(L.dropMissingFiles(s, []), 1);
  assert.equal(s.videos[f1], undefined);
  assert.deepEqual(s.days[0].items, []);
});

test('playlist links: the list in a playlist or song link; a Mix is marked; other text gives none', () => {
  assert.deepEqual(L.playlistIn('https://www.youtube.com/playlist?list=PLabc_DEF-123'), { id: 'PLabc_DEF-123', mix: false });
  assert.deepEqual(L.playlistIn(`look: https://music.youtube.com/watch?v=${A}&list=OLAK5uy_xyz`), { id: 'OLAK5uy_xyz', mix: false });
  assert.deepEqual(L.playlistIn(`youtube.com/watch?v=${A}&list=RD${A}&start_radio=1`), { id: 'RD' + A, mix: true });
  for (const no of ['', 'lofi beats', `https://youtu.be/${A}`, 'https://example.com/playlist?list=PL1', 'https://www.youtube.com/playlist?list=<x>']) assert.equal(L.playlistIn(no), null, no);
});

test('playlists in Music: an import fills its own playlist, songs move in and out, deleting keeps or takes the songs', () => {
  const s = L.emptyState(), now = at('2026-10-07T10:00');
  const liked = L.playlistFrom(s, 'LLabc', 'Liked videos', now);
  assert.equal(L.importToMusic(s, [{ id: A, title: 'a' }, { id: B, title: 'b' }, { id: C, title: 'c' }], now, liked.id), 3);
  assert.equal(L.playlistFrom(s, 'LLabc', 'Liked videos', now), liked);           // a second import fills the same one
  assert.equal(L.importToMusic(s, [{ id: A }, { id: D }], now, liked.id), 2);
  assert.deepEqual(liked.items, [A, B, C, D]);
  assert.deepEqual(s.music, [A, B, C, D]);

  const { playlist: work } = L.newPlaylist(s, 'Work', '', now);
  assert.equal(L.newPlaylist(s, ' work ', '', now).error, 'There is a playlist "work" already.');
  assert.ok(L.newPlaylist(s, '  ', '', now).error);
  L.addToPlaylist(s, work.id, A); L.addToPlaylist(s, work.id, B); L.addToPlaylist(s, work.id, A);
  assert.deepEqual(L.songsOf(s, work.id), [A, B]);
  assert.deepEqual(L.songsOf(s, ''), s.music);
  L.addToInbox(s, [E], {}, now);
  assert.ok(L.addToPlaylist(s, work.id, E).error);                                 // only songs in Music

  L.removeFromPlaylist(s, work.id, B);
  assert.deepEqual(work.items, [A]);
  assert.ok(s.music.includes(B));                                                  // out of a playlist, still in Music
  L.moveTo(s, A, 'inbox');                                                         // a song leaving Music leaves its playlists
  assert.deepEqual(work.items, []);
  assert.deepEqual(liked.items, [B, C, D]);

  L.addToPlaylist(s, work.id, C);
  assert.equal(L.deletePlaylist(s, liked.id, true), 2);                            // C is also in Work: it stays
  assert.deepEqual(s.music, [C]);
  assert.equal(s.videos[B], undefined);
  assert.equal(L.deletePlaylist(s, work.id), 0);
  assert.deepEqual(s.music, [C]);
  assert.deepEqual(s.playlists, []);
});

test('playlists survive saving: unknown songs and broken entries are dropped', () => {
  const s = L.emptyState();
  L.importToMusic(s, [{ id: A }, { id: B }]);
  const { playlist } = L.newPlaylist(s, 'Sport');
  L.addToPlaylist(s, playlist.id, A);
  const raw = JSON.parse(JSON.stringify(s));
  raw.playlists[0].items.push(C, 'nonsense');
  raw.playlists.push({ id: 'bad id', name: 'x', items: [] }, { id: 'p2', name: '', items: [] }, null);
  const back = L.cleanState(raw);
  assert.deepEqual(back.playlists, [{ id: playlist.id, name: 'Sport', from: '', items: [A] }]);
  assert.deepEqual(L.cleanState({}).playlists, []);
});
