// The bridge between Deine Röhre's page and its main program (main.mjs). The page gets these calls and nothing else.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('roehre', {
  desktop: true,                                                // the PC app: window in front, mini player, media keys
  load: () => ipcRenderer.invoke('wl:load'),                    // the saved lists (lists.json)
  save: (state) => ipcRenderer.invoke('wl:save', state),        // write them back
  info: (ids) => ipcRenderer.invoke('wl:info', ids),            // { id: { ok, title, channel } } from YouTube
  onTop: (on) => ipcRenderer.send('wl:onTop', on),              // the window stays in front of other programs
  mini: (on, kind) => ipcRenderer.send('wl:mini', on, kind),    // small player in the corner, always in front ('video' / 'music')
  watching: (on) => ipcRenderer.send('wl:watching', on),        // the video fills the window: Escape is the page's
  fullscreen: () => ipcRenderer.send('wl:fullscreen'),          // the whole screen, or back (F11)
  youtube: (id) => ipcRenderer.send('wl:youtube', id),          // open on youtube.com in the browser
  onKey: (fn) => ipcRenderer.on('wl:key', (_e, action) => fn(action)),   // media keys: toggle / next / previous
  // Tim's own videos and the iPhone at home (each answers { ok, value } or { ok: false, error }):
  files: {
    info: () => ipcRenderer.invoke('f:info'),                   // { folder, home, addresses, code, phones }
    scan: () => ipcRenderer.invoke('f:scan'),                   // [{ id, path, name, size }] or null (no folder)
    choose: () => ipcRenderer.invoke('f:choose'),               // pick another folder
    open: () => ipcRenderer.invoke('f:open'),                   // show the folder in Explorer
    base: () => ipcRenderer.invoke('f:base'),                   // { base, key } for the player
    home: (on) => ipcRenderer.invoke('h:set', on),              // share with the iPhone at home, or stop
    newCode: () => ipcRenderer.invoke('h:newCode'),
  },
  now: (state) => ipcRenderer.send('wl:now', state),           // what plays, for the iPhone remote
  onControl: (fn) => ipcRenderer.on('wl:control', (_e, command) => fn(command)),   // the iPhone remote's buttons
  onRemote: (fn) => ipcRenderer.on('wl:remote', (_e, state) => fn(state)),   // the iPhone changed the lists
  // Google (read only; each answers { ok, value } or { ok: false, error, signedOut }):
  google: {
    status: () => ipcRenderer.invoke('g:status'),               // { configured, signedIn }
    chooseClient: () => ipcRenderer.invoke('g:client'),         // pick the downloaded client file
    signIn: () => ipcRenderer.invoke('g:signIn'),               // the browser opens Google's page
    signOut: () => ipcRenderer.invoke('g:signOut'),
    feed: (since) => ipcRenderer.invoke('g:feed', since),       // new uploads of the subscribed channels since then
    playlists: () => ipcRenderer.invoke('g:playlists'),         // [{ id, title, count }], liked videos first
    playlist: (id) => ipcRenderer.invoke('g:playlist', id),     // { title, videos } of one playlist
    search: (q, music) => ipcRenderer.invoke('g:search', q, music), // up to 25 videos; with music only songs
    categories: (ids) => ipcRenderer.invoke('g:categories', ids), // { id: YouTube category }; '10' is Music
    driveLoad: () => ipcRenderer.invoke('g:driveLoad'),         // the shared lists from Drive (or null)
    driveSave: (state) => ipcRenderer.invoke('g:driveSave', state),
  },
});
