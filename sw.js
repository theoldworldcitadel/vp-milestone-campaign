/* The Road to Legend: service worker. Cache name is tied to the build hash, so every build is a new cache. */
const CACHE = 'rtl-9f122a0e334c';
const PRECACHE = ["./", "index.html", "manifest.webmanifest", "icons/app-icon-192.png", "icons/app-icon-512.png", "icons/app-icon-maskable-512.png", "icons/apple-touch-icon-180.png", "icons/favicon.ico", "icons/favicon-32.png", "icons/app-icon-1024.png", "icons/app-icon-monochrome-512.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))));
  // no skipWaiting here: the page shows "Update available" and the player chooses when to reload
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rtl-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
const isPage = req => req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (isPage(req)) {   // network-first for the app page (fresh when online, cached when offline)
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch(req, { signal: ctl.signal, cache: 'no-cache' }); clearTimeout(t);
        if (res && res.ok) cache.put('index.html', res.clone());
        return res;
      } catch (err) {
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {   // cache-first for icons and the manifest
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
