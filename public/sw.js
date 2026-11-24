const CACHE = 'global-chess-ultimate-v5-sheets-2';
const CORE = ['/', '/manifest.webmanifest', '/icon.svg', '/art/sheet-gold-knight.svg', '/art/sheet-reward-chest.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Keep optional premium GLB/FBX art outside runtime cache: it can exceed 100 MiB.
  // Critical: Vite uses /assets/ for hashed JS/CSS too; those MUST remain cacheable for offline PWA.
  const optional3D = /^\/assets\/(?:models|chessset|humanoid|previews)\//.test(url.pathname)
    || url.pathname === '/assets/asset-manifest.json';
  if (optional3D) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? caches.match('/') : Response.error())));
});
