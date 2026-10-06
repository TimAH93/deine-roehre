// Deine Röhre's small offline helper (web-api.mjs registers it): the page's own files come from the network when it
// can be reached, else from the last copy. Nothing else is touched: YouTube, Google and Drive always go to the network.
const CACHE = 'roehre-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((hit) => hit || Response.error())));
});
