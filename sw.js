// Offline cache for the app shell. Data lives in IndexedDB, not here.
const CACHE = 'ato-web-1.0.81-77dc0ff3';
const SHELL = ['./', './index.html', './app.js?v=1.0.81-77dc0ff3', './app.css?v=1.0.81-77dc0ff3', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ato-web-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).searchParams.has('check')) return; // update check (修正清單 #64): always the network, never cached
  if (req.mode === 'navigate') {
    // network first for the page so updates arrive; fall back to cache offline
    // 修正清單 #545: past the browser's own copy too (cache: 'no-cache' asks the server, which answers 304 when nothing changed) — a page
    // added to the home screen right after an update must be the new one, its settings are read only then
    e.respondWith(fetch(req.url, { cache: 'no-cache' }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); } return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  })));
});
