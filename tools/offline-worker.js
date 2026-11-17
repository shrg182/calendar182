// The build injects an immutable app-shell list and a content-derived cache name.
const BUILD = null;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(BUILD.cache);
    try {
      await cache.addAll(BUILD.files.map(url => new Request(url, {cache: 'reload'})));
    } catch (error) {
      await caches.delete(BUILD.cache);
      throw error;
    }
    // Do not skipWaiting: existing tabs and drafts keep their current version.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(BUILD.prefix) && key !== BUILD.cache) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never store API responses, sign-ins, notes or arbitrary URLs in Cache Storage.
  const shell = request.mode === 'navigate' && url.pathname === BUILD.base;
  const resource = url.pathname + url.search;
  if (!shell && !BUILD.files.includes(resource)) return;
  event.respondWith((async () => {
    const cache = await caches.open(BUILD.cache);
    return await cache.match(shell ? BUILD.base : resource) || fetch(request);
  })());
});
