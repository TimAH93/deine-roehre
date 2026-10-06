// The bridge between Deine Röhre's page and its main program (main.mjs). The page gets these calls and nothing else.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('roehre', {
  load: () => ipcRenderer.invoke('wl:load'),                    // the saved lists (lists.json)
  save: (state) => ipcRenderer.invoke('wl:save', state),        // write them back
  info: (ids) => ipcRenderer.invoke('wl:info', ids),            // { id: { ok, title, channel } } from YouTube
  onTop: (on) => ipcRenderer.send('wl:onTop', on),              // the window stays in front of other programs
  mini: (on) => ipcRenderer.send('wl:mini', on),                // small player in the corner, always in front
  youtube: (id) => ipcRenderer.send('wl:youtube', id),          // open on youtube.com in the browser
  onKey: (fn) => ipcRenderer.on('wl:key', (_e, action) => fn(action)),   // media keys: toggle / next / previous
  // Google (read only; each answers { ok, value } or { ok: false, error, signedOut }):
  google: {
    status: () => ipcRenderer.invoke('g:status'),               // { configured, signedIn }
    chooseClient: () => ipcRenderer.invoke('g:client'),         // pick the downloaded client file
    signIn: () => ipcRenderer.invoke('g:signIn'),               // the browser opens Google's page
    signOut: () => ipcRenderer.invoke('g:signOut'),
    feed: (since) => ipcRenderer.invoke('g:feed', since),       // new uploads of the subscribed channels since then
    playlists: () => ipcRenderer.invoke('g:playlists'),         // [{ id, title, count }], liked videos first
    playlist: (id) => ipcRenderer.invoke('g:playlist', id),     // the videos in one playlist
  },
});
