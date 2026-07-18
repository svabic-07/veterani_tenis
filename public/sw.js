/* TVS servisni radnik — offline tolerancija za rad na terenu.
 *
 * Strategija (namerno konzervativna — zastareo sadržaj je gori od offline poruke):
 * - Stranice/RSC/slike: NETWORK-FIRST. Keš se koristi ISKLJUČIVO kad mreža
 *   padne (sudija na terenu bez signala vidi poslednje viđeno stanje žreba).
 * - /_next/static: CACHE-FIRST (fajlovi su hešovani, immutable).
 * - /api/*, /prijava, /nalog, POST: ne dira se (auth i mutacije uvek uživo).
 */

const VERSION = "tvs-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";
const PAGES_MAX = 150;

// putanje koje se nikad ne keširaju (prolaze direktno na mrežu)
const NEVER_CACHE = ["/api/", "/prijava", "/nalog", "/en/prijava", "/en/nalog"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  // keys() vraća redosled ubacivanja — briši najstarije
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/** Keš ključ: HTML navigacije i RSC payload za isti URL se čuvaju ODVOJENO
 *  (inače prefetch pregazi HTML pa offline navigacija ne nađe stranicu);
 *  volatilni `_rsc` parametar se normalizuje da keš ne raste bez kraja. */
function cacheKeyFor(request) {
  const url = new URL(request.url);
  const isRsc = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  url.searchParams.delete("_rsc");
  if (isRsc) url.searchParams.set("__sw", "rsc");
  return url.toString();
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  const key = cacheKeyFor(request);
  try {
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "default")) {
      cache.put(key, response.clone());
      trimCache(PAGES_CACHE, PAGES_MAX); // bez čekanja
    }
    return response;
  } catch (err) {
    const cached = await cache.match(key, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((p) => url.pathname === p || url.pathname.startsWith(p))) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
