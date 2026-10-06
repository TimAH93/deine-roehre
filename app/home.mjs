// Deine Röhre at home (README.md "Eigene Videos" and "iPhone zu Hause"): Tim's own video folder, and the PC sharing
// the app with his iPhone in the home Wi-Fi. Plain Node, no Electron, so it can be tested on its own.
//
// The folder: every video file in it (and its subfolders) gets an id from its path (f_ + 16 hex), so the same file
// keeps its place in the lists. Files are sent with byte ranges, so the player can jump.
//
// The home server (only while Tim switches it on in Settings): the same page on the PC's own address in the Wi-Fi,
// port 47832. Nothing but the page's own files is open; the lists and the videos need a key, which a phone gets once
// for the 6-digit code shown on the PC (five wrong codes a minute at most).
import { promises as fs, createReadStream } from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export const HOME_PORT = 47832;
export const VIDEO_TYPES = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska' };
const MAX_FILES = 5000, MAX_DEPTH = 5;

export const fileId = (rel) => 'f_' + crypto.createHash('sha1').update(rel.replace(/\\/g, '/').toLowerCase()).digest('hex').slice(0, 16);

// Every video file in the folder: [{ id, path (relative, with /), name, size, abs }]. A missing folder gives null.
export async function scanFolder(folder) {
  try { if (!(await fs.stat(folder)).isDirectory()) return null; } catch { return null; }
  const out = [];
  async function walk(dir, depth) {
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(abs, depth + 1); continue; }
      if (!e.isFile() || !VIDEO_TYPES[path.extname(e.name).toLowerCase()]) continue;
      const rel = path.relative(folder, abs).split(path.sep).join('/');
      let size = 0;
      try { size = (await fs.stat(abs)).size; } catch { continue; }
      out.push({ id: fileId(rel), path: rel, name: e.name, size, abs });
      if (out.length >= MAX_FILES) return;
    }
  }
  await walk(folder, 0);
  return out;
}

// One video file to a request, with byte ranges ("Range: bytes=1000-"), so the player can jump and phones can stream.
export async function sendVideo(req, res, abs) {
  let size;
  try { size = (await fs.stat(abs)).size; } catch { res.writeHead(404).end('Not found'); return; }
  const type = VIDEO_TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!m) {
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(abs).pipe(res);
    return;
  }
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (!(start >= 0 && start <= end && end < size)) { res.writeHead(416, { 'content-range': `bytes */${size}` }).end(); return; }
  res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(abs, { start, end }).pipe(res);
}

// The PC's addresses in the home network (192.168.x.x, 10.x.x.x, 172.16-31.x.x), the usual one first.
export function homeAddresses() {
  const found = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) found.push(a.address);
    }
  }
  return found.sort((a, b) => a.startsWith('192.168.') ? -1 : b.startsWith('192.168.') ? 1 : 0);
}

const json = (res, status, value) => res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(value));
async function body(req, limit = 4 * 1024 * 1024) {
  let size = 0; const parts = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('too big'); parts.push(chunk); }
  return JSON.parse(Buffer.concat(parts).toString('utf8') || 'null');
}

// The home server. `deps`: pages { path: file }, types { ext: type }, code() the 6-digit code, keys() / addKey(key)
// the phones' keys, load() / save(state) the lists, info(ids) titles, fileFor(id) a video's full path or null.
export function startHome(deps) {
  const tries = [];
  const allowed = (req, url) => {
    const key = req.headers['x-roehre-key'] || url.searchParams.get('k') || '';
    return !!key && deps.keys().includes(key);
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/api/pair' && req.method === 'POST') {   // the 6-digit code for a key
        const now = Date.now();
        while (tries.length && now - tries[0] > 60000) tries.shift();
        if (tries.length >= 5) { json(res, 429, { error: 'Too many tries. Wait a minute.' }); return; }
        const { code } = (await body(req, 1000)) || {};
        if (String(code || '').trim() !== deps.code()) { tries.push(now); json(res, 403, { error: 'That code is not the one shown on the PC (Settings).' }); return; }
        const key = crypto.randomBytes(24).toString('base64url');
        await deps.addKey(key);
        json(res, 200, { key });
        return;
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/file/')) {
        if (!allowed(req, url)) { json(res, 401, { error: 'not paired' }); return; }
        if (url.pathname === '/api/lists' && req.method === 'GET') { json(res, 200, await deps.load()); return; }
        if (url.pathname === '/api/lists' && req.method === 'PUT') { json(res, 200, { saved: await deps.save(await body(req)) }); return; }
        if (url.pathname === '/api/updated' && req.method === 'GET') { json(res, 200, { updated: (await deps.load())?.updated || '' }); return; }
        if (url.pathname === '/api/info' && req.method === 'POST') { const ids = await body(req, 100000); json(res, 200, await deps.info(Array.isArray(ids) ? ids.map(String) : [])); return; }
        if (url.pathname.startsWith('/file/') && (req.method === 'GET' || req.method === 'HEAD')) {
          const abs = await deps.fileFor(url.pathname.slice(6));
          if (!abs) { res.writeHead(404).end('Not found'); return; }
          await sendVideo(req, res, abs);
          return;
        }
        json(res, 404, { error: 'not found' });
        return;
      }
      const file = deps.pages[url.pathname];
      if (!file || req.method !== 'GET') { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, { 'content-type': deps.types[path.extname(file)] || 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(await fs.readFile(file));
    } catch (e) { if (!res.headersSent) json(res, 500, { error: String(e.message || e) }); else res.end(); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(HOME_PORT, '0.0.0.0', () => resolve({ stop: () => new Promise((r) => server.close(() => r())), port: HOME_PORT }));
  });
}
