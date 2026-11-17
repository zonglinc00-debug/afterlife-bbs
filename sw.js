/* Afterlife BBS service worker.
   Offline support for this site's own static files only.
   No external requests are cached, and no data ever leaves the device.

   Cache safety (REQ-35): the cache name carries a version, so shipping a
   new sw.js retires the old cache; navigations and scripts are
   network-first (fresh code when online, cache when offline), while
   images, styles, and seed data stay cache-first. The old v1 worker was
   cache-first for everything and its file never changed between releases,
   so returning visitors could be served the old app.js forever while the
   new index.html arrived — that is how the round-2 red team saw a
   homepage with a digest link that led nowhere.

   One more trap, found by the update simulation: a service worker's
   fetch() still honours the browser HTTP cache, and static hosts serve
   Last-Modified (GitHub Pages: max-age=600), so a warm HTTP cache can
   hand the worker a stale app.js even on a "network-first" fetch — the
   simulation caught the v2 cache itself being filled with the old
   app.js. Every network fetch here therefore uses cache: "reload", which
   revalidates with the server instead of trusting the HTTP cache. */

const CACHE_NAME = "afterlife-bbs-v2";
const PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "favicon.svg",
  "data/seed.json",
  "data/seed-marlowe.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        // cache: "reload" — precache must not inherit a warm HTTP cache's
        // stale copy of a file (see the header comment).
        Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: "reload" }))))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
  }
  return res;
}

/** Fresh when online, cached when offline. For navigations and scripts:
    the files whose staleness would show a different product. The fetch
    bypasses the browser HTTP cache (cache: "reload") — without that, a
    warm HTTP cache can serve the previous release's app.js to this very
    fetch, and the "network-first" label would be a lie. */
function networkFirst(req) {
  return fetch(req, { cache: "reload" })
    .then((res) => putInCache(req, res))
    .catch(() => caches.match(req).then((cached) => cached || Response.error()));
}

/** Cache first, then network. For styles, images, and seed data: cheap
    to serve stale for one visit, and the app never depends on their
    exact version to route correctly. */
function cacheFirst(req) {
  return caches.match(req).then((cached) => {
    if (cached) return cached;
    return fetch(req).then((res) => putInCache(req, res));
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle same-origin GET requests for this site's own files.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const networkFirstRequest = req.mode === "navigate" || url.pathname.endsWith(".js");
  event.respondWith(networkFirstRequest ? networkFirst(req) : cacheFirst(req));
});
