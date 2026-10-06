// Deine Röhre's main program (README.md): one ordinary window you can resize and move, with Tim's own lists of
// YouTube videos and nothing else, no recommendations. The page (index.html, app.mjs) comes from a small server on
// 127.0.0.1 inside this program, because YouTube's embedded player refuses pages without a web address (file://).
// The lists are kept in lists.json in Electron's user-data folder (%APPDATA%\deine-roehre on Windows); the window's
// place and size in window.json next to it. The page reaches the disk and the window only through preload.cjs.
import { app, BrowserWindow, Menu, ipcMain, shell, screen, globalShortcut, session } from 'electron';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanState, emptyState, watchUrl } from './lists.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// The files the page may load: this folder's page files, the UI base and the Archon Grid design kit with its Fraktur
// (kit/, kit/README.md), and the emblem from the brand folder when it is there.
const FILES = {
  '/': path.join(HERE, 'index.html'),
  '/app.mjs': path.join(HERE, 'app.mjs'),
  '/app.css': path.join(HERE, 'app.css'),
  '/lists.mjs': path.join(HERE, 'lists.mjs'),
  '/ui_base.css': path.join(HERE, 'kit', 'ui_base.css'),
  '/ui_base.js': path.join(HERE, 'kit', 'ui_base.js'),
  '/archon_ui.css': path.join(HERE, 'kit', 'archon_ui.css'),
  '/archon_ui.js': path.join(HERE, 'kit', 'archon_ui.js'),
  '/fraktur.ttf': path.join(HERE, 'kit', 'UnifrakturMaguntia.ttf'),
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
// One fixed address, so the page's remembered window places (kept per address) survive a restart.
const PORT = 47831;

// The emblem in this repository's brand folder (or one of its subfolders, not references): an image whose name holds
// "archon", not a mood picture; archon-grid.* first, a PNG before a JPEG (brand/README.md).
async function findEmblem() {
  const brand = path.join(ROOT, 'brand'), order = ['.png', '.webp', '.jpg', '.jpeg'];
  const places = [brand];
  try { for (const d of await fs.readdir(brand, { withFileTypes: true })) if (d.isDirectory() && d.name.toLowerCase() !== 'references') places.push(path.join(brand, d.name)); } catch { return null; }
  const found = [];
  for (const place of places) {
    let names = [];
    try { names = await fs.readdir(place); } catch { continue; }
    for (const name of names) {
      const ext = path.extname(name).toLowerCase(), stem = path.basename(name, path.extname(name)).toLowerCase();
      if (!order.includes(ext) || !stem.includes('archon') || /^archon-[a-z]+-[12]$/.test(stem)) continue;
      const file = path.join(place, name);
      try { if ((await fs.stat(file)).size > 200) found.push({ file, stem, ext }); } catch { /* gone */ }   // an LFS pointer is a few lines of text
    }
  }
  found.sort((a, b) => (a.stem !== 'archon-grid') - (b.stem !== 'archon-grid') || order.indexOf(a.ext) - order.indexOf(b.ext) || a.file.localeCompare(b.file));
  return found[0]?.file || null;
}
const MINI = { width: 360, height: 250 };   // the mini player: the video and one row of controls

if (!app.requestSingleInstanceLock()) app.quit();

const dataFile = () => path.join(app.getPath('userData'), 'lists.json');
const windowFile = () => path.join(app.getPath('userData'), 'window.json');
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }
async function writeJson(file, value) {   // written whole to a side file first, so a crash never leaves half a list
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file + '.tmp', JSON.stringify(value, null, 2));
  await fs.rename(file + '.tmp', file);
}

async function startServer() {
  const emblem = await findEmblem();
  if (emblem) FILES['/emblem'] = emblem;   // no emblem: the page shows the words Deine Röhre in Fraktur instead
  const server = http.createServer(async (req, res) => {
    const file = FILES[new URL(req.url, 'http://x').pathname];
    if (!file || req.method !== 'GET') { res.writeHead(404).end('Not found'); return; }
    try { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(await fs.readFile(file)); }
    catch { res.writeHead(404).end('Not found'); }
  });
  const listen = (port) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve()); });
  try { await listen(PORT); } catch { await listen(0); }   // the fixed port taken by another program: any free one (places then start fresh)
  return `http://127.0.0.1:${server.address().port}/`;
}

// Title and channel of each video from YouTube's public oEmbed address (no key, no account).
// ok: false when the video is private, deleted or may not be shown outside YouTube.
async function videoInfo(ids) {
  const out = {};
  await Promise.all(ids.slice(0, 50).map(async (id) => {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) { out[id] = { ok: false }; return; }
      const j = await r.json();
      out[id] = { ok: true, title: String(j.title || ''), channel: String(j.author_name || '') };
    } catch { out[id] = { ok: null }; }   // offline: try again later
  }));
  return out;
}

let win = null, normalBounds = null, mini = false, onTop = false;

// A remembered place is used only while it still lies on a connected screen.
function onScreen(b) {
  return b && screen.getAllDisplays().some(({ workArea: a }) => b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y >= a.y - 10 && b.y < a.y + a.height - 60);
}
async function saveWindow() {
  if (!win || win.isDestroyed()) return;
  const bounds = mini ? normalBounds : win.getNormalBounds();
  await writeJson(windowFile(), { bounds, maximized: !mini && win.isMaximized() });
}

async function createWindow(url) {
  const saved = await readJson(windowFile(), {});
  const bounds = onScreen(saved.bounds) ? saved.bounds : { width: 1000, height: 640 };
  win = new BrowserWindow({
    ...bounds, minWidth: 300, minHeight: 200, show: false, title: 'Deine Röhre', autoHideMenuBar: true,
    backgroundColor: '#040303',
    webPreferences: { preload: path.join(HERE, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  if (saved.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  // The page stays the page: no navigating away, no new windows (a click on the player's YouTube logo does nothing).
  win.webContents.on('will-navigate', (e, to) => { if (to !== url) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let timer = null;
  const later = () => { clearTimeout(timer); timer = setTimeout(saveWindow, 400); };
  win.on('resize', later); win.on('move', later);
  win.on('close', () => { clearTimeout(timer); saveWindow(); });
  win.on('closed', () => { win = null; });
  win.loadURL(url);
}

function setMini(on) {
  if (!win || on === mini) return;
  if (on) {
    normalBounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    if (win.isMaximized()) win.unmaximize();
    mini = true;
    const a = screen.getDisplayMatching(normalBounds).workArea;
    win.setMinimumSize(240, 170);
    win.setBounds({ x: a.x + a.width - MINI.width - 16, y: a.y + a.height - MINI.height - 16, ...MINI });
    win.setAlwaysOnTop(true, 'floating');
  } else {
    mini = false;
    win.setMinimumSize(300, 200);
    if (normalBounds) win.setBounds(normalBounds);
    win.setAlwaysOnTop(onTop, 'floating');
  }
}

ipcMain.handle('wl:load', async () => {
  const raw = await readJson(dataFile(), null);
  const state = raw ? cleanState(raw) : emptyState();
  onTop = state.settings.onTop;
  if (win) win.setAlwaysOnTop(onTop, 'floating');
  return state;
});
ipcMain.handle('wl:save', async (_e, state) => { await writeJson(dataFile(), cleanState(state)); });
ipcMain.handle('wl:info', (_e, ids) => videoInfo((Array.isArray(ids) ? ids : []).filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id))));
ipcMain.on('wl:onTop', (_e, on) => { onTop = !!on; if (win && !mini) win.setAlwaysOnTop(onTop, 'floating'); });
ipcMain.on('wl:mini', (_e, on) => setMini(!!on));
ipcMain.on('wl:youtube', (_e, id) => { if (/^[A-Za-z0-9_-]{11}$/.test(id)) shell.openExternal(watchUrl(id)); });

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  // The page may go full screen (the player's own button); it may not use the camera, microphone, location and so on.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, done) => done(permission === 'fullscreen'));
  // The keyboard's media keys play, pause and skip even while another program is in front (if no other program took them).
  for (const [key, action] of [['MediaPlayPause', 'toggle'], ['MediaNextTrack', 'next'], ['MediaPreviousTrack', 'previous']]) {
    try { globalShortcut.register(key, () => win?.webContents.send('wl:key', action)); } catch { /* taken: fine */ }
  }
  await createWindow(await startServer());
});
