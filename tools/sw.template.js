// Offline support. tools/make-sw.mjs copies this file to dist/sw.js after every build, filling in the build's
// version and the list of every file of the game, so the whole game is kept on the device and works with no network.
// (Not loaded in development: the page only registers it from a production build.)
const VERSION = '__VERSION__';
const FILES = __FILES__;
const PREFIX = 'tap-tap-fishing-';
const CACHE = `${PREFIX}${VERSION}`;
// On the very first install there is no active worker yet: tell the open page that the game now works offline.
const FIRST_INSTALL = !self.registration.active;
const at = (file) => new URL(file, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['./', ...FILES].map(at)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Older builds' files go away as soon as this build has everything.
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
    if (FIRST_INSTALL) for (const client of await self.clients.matchAll({ includeUncontrolled: true })) client.postMessage({ type: 'offline-ready' });
  })());
});

// Files come from the device first; anything missing is fetched and kept. A page opened with no network gets the
// game's own page (any ?query is ignored), so the app still starts from the home screen in aeroplane mode.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const navigating = request.mode === 'navigate';
    // ignoreVary: module scripts are fetched with an Origin header that the stored copy was not asked with.
    const hit = await cache.match(request, { ignoreSearch: navigating, ignoreVary: true });
    if (hit) return hit;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (navigating) return (await cache.match(at('index.html'))) ?? Response.error();
      throw error;
    }
  })());
});
