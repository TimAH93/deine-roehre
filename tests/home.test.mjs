// Deine Röhre at home (app/home.mjs): the video folder, byte ranges, and the home server's code and keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as H from '../app/home.mjs';

function folder(t) {
  const root = mkdtempSync(join(tmpdir(), 'roehre-home-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'Show'));
  writeFileSync(join(root, 'Show', 'My.Show.S01E01.mp4'), Buffer.from('0123456789'));
  writeFileSync(join(root, 'Film.mkv'), Buffer.from('abcdef'));
  writeFileSync(join(root, 'notes.txt'), 'not a video');
  writeFileSync(join(root, '.hidden.mp4'), 'x');
  return root;
}

test('folder: video files only, ids from the path (the same file keeps its id), a missing folder is null', async (t) => {
  const root = folder(t);
  const files = (await H.scanFolder(root)).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(files.map((f) => [f.path, f.size]), [['Film.mkv', 6], ['Show/My.Show.S01E01.mp4', 10]]);
  assert.match(files[0].id, /^f_[0-9a-f]{16}$/);
  assert.equal(H.fileId('Show\\My.Show.S01E01.mp4'), files[1].id);   // Windows' backslash, any case: the same id
  assert.equal(await H.scanFolder(join(root, 'nope')), null);
});

test('home server: the page is open; lists and videos need a key, got once for the code; byte ranges', async (t) => {
  const root = folder(t);
  const files = await H.scanFolder(root);
  let lists = { updated: '2026-10-06T10:00:00.000Z', inbox: [] }, keys = [];
  const page = join(root, 'index.html'); writeFileSync(page, '<!doctype html><title>Deine Röhre</title>');
  const home = await H.startHome({
    pages: { '/': page }, types: { '.html': 'text/html' }, code: () => '123456',
    keys: () => keys, addKey: async (k) => { keys.push(k); },
    load: async () => lists, save: async (s) => { lists = s; return true; },
    info: async (ids) => Object.fromEntries(ids.map((id) => [id, { ok: true, title: 'T ' + id }])),
    fileFor: async (id) => files.find((f) => f.id === id)?.abs || null,
  });
  t.after(() => home.stop());
  const base = `http://127.0.0.1:${H.HOME_PORT}`;
  assert.match(await (await fetch(base + '/')).text(), /Deine Röhre/);
  assert.equal((await fetch(base + '/api/lists')).status, 401);
  assert.equal((await fetch(`${base}/file/${files[0].id}`)).status, 401);
  const pair = (code) => fetch(base + '/api/pair', { method: 'POST', body: JSON.stringify({ code }) });
  assert.equal((await pair('000000')).status, 403);
  const { key } = await (await pair('123456')).json();
  assert.ok(key);
  const auth = { 'x-roehre-key': key };
  assert.equal((await (await fetch(base + '/api/lists', { headers: auth })).json()).updated, lists.updated);
  await fetch(base + '/api/lists', { method: 'PUT', headers: auth, body: JSON.stringify({ updated: 'later', inbox: ['x'] }) });
  assert.deepEqual(lists.inbox, ['x']);
  assert.equal((await (await fetch(base + '/api/updated', { headers: auth })).json()).updated, 'later');
  const film = files.find((f) => f.path === 'Film.mkv');
  const whole = await fetch(`${base}/file/${film.id}?k=${key}`);
  assert.equal(whole.status, 200);
  assert.equal(await whole.text(), 'abcdef');
  const part = await fetch(`${base}/file/${film.id}?k=${key}`, { headers: { range: 'bytes=2-3' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), 'bytes 2-3/6');
  assert.equal(await part.text(), 'cd');
  assert.equal((await fetch(`${base}/file/${film.id}?k=${key}`, { headers: { range: 'bytes=9-' } })).status, 416);
  for (let i = 0; i < 4; i++) await pair('999999');   // with the first wrong one: five in a minute
  assert.equal((await pair('123456')).status, 429);
});

test('home server as a remote: what plays and the buttons need a key; only known buttons go on to the PC', async (t) => {
  const sent = [];
  let keys = [], window = true;
  const home = await H.startHome({
    pages: {}, types: {}, code: () => '654321', keys: () => keys, addKey: async (k) => { keys.push(k); },
    load: async () => ({}), save: async () => true, info: async () => ({}), fileFor: async () => null,
    now: () => ({ playing: true, title: 'Song', paused: false }),
    control: async (c) => { if (!window) return false; sent.push(c); return true; },
  });
  t.after(() => home.stop());
  const base = `http://127.0.0.1:${H.HOME_PORT}`;
  // fetch may hold a connection to the server of the test before (closed now): the first call opens a fresh one
  const first = await fetch(base + '/api/now').catch(() => fetch(base + '/api/now'));
  assert.equal(first.status, 401);
  assert.equal((await fetch(base + '/api/control', { method: 'POST', body: '{"action":"next"}' })).status, 401);
  const { key } = await (await fetch(base + '/api/pair', { method: 'POST', body: JSON.stringify({ code: '654321' }) })).json();
  const auth = { 'x-roehre-key': key };
  assert.equal((await (await fetch(base + '/api/now', { headers: auth })).json()).title, 'Song');
  const press = (c) => fetch(base + '/api/control', { method: 'POST', headers: auth, body: JSON.stringify(c) });
  assert.deepEqual(await (await press({ action: 'next' })).json(), { done: true });
  await press({ action: 'play', list: 'pwork1', id: 'dQw4w9WgXcQ', extra: 'dropped' });
  await press({ action: 'add', list: 'pwork1' });
  for (const bad of [{ action: 'quit' }, { action: 'add' }, { action: 'play', list: '../x' }, { action: 'play', id: 'nope' }]) assert.equal((await press(bad)).status, 400);
  assert.deepEqual(sent, [{ action: 'next' }, { action: 'play', list: 'pwork1', id: 'dQw4w9WgXcQ' }, { action: 'add', list: 'pwork1' }]);
  window = false;
  assert.deepEqual(await (await press({ action: 'toggle' })).json(), { done: false });
});
