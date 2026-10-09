// Service worker: keeps the guide and the log usable in the park's dead zones (the Ramble, the
// North Woods). Hand-written rather than a plugin — the rules are few:
//   pages             network first, cached copy when offline (so online visits stay fresh)
//   /_next/static     cache first (content-hashed, never changes under the same URL)
//   /_next/image      cache first, capped (species photos already seen)
//   /api/*            untouched: live sightings/forecast show their own offline error rather than
//                     stale data passed off as current
// Bump VERSION to drop every cache on the next visit.
const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const MAX_IMAGES = 150;

// Precached on install so they open offline even if never visited. Species pages are cached as
// they're visited — precaching all of them would cost megabytes on a phone plan.
const SHELL = ['/', '/guide', '/guide/glossary', '/log', '/log/lists', '/log/outing'];

const STATIC_ASSET = /\/_next\/static\/[^"'\s)\\]+/g;

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Caches each shell page and the scripts/styles/fonts it references. The page the visitor is on
 * loaded its chunks before this worker existed, so without this the cached HTML would come back
 * offline with no JavaScript — and the log needs JavaScript to read IndexedDB.
 */
async function precacheShell() {
  const pages = await caches.open(PAGES);
  const assets = new Set();
  await Promise.all(
    SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) return;
        await pages.put(path, response.clone());
        for (const url of (await response.text()).match(STATIC_ASSET) ?? []) assets.add(url);
      } catch {
        // Offline during install: the page gets cached on its next online visit instead.
      }
    }),
  );
  const statics = await caches.open(STATIC);
  await Promise.all([...assets].map((url) => statics.add(url).catch(() => {})));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request, url));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC));
  } else if (url.pathname === '/_next/image') {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
  }
});

async function networkFirstPage(request, url) {
  const cache = await caches.open(PAGES);
  // Query strings are ignored for the cache key: /log/outing?id=… is one client-rendered page
  // whose outing comes from IndexedDB, not from the URL's server response.
  const key = url.pathname;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(key, response.clone());
    return response;
  } catch {
    return (await cache.match(key)) ?? offlinePage();
  }
}

// A page never opened online. Plain words rather than another page's content under this URL.
function offlinePage() {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Central Park Birding</title>
<body style="font-family:system-ui,sans-serif;background:#f2f3e4;color:#1b2a21;margin:0;padding:2rem 1rem;line-height:1.5">
<main style="max-width:32rem;margin:0 auto">
<h1 style="font-size:1.5rem">You’re offline</h1>
<p>This page hasn’t been saved on your phone yet. Pages you’ve opened before, the field guide, and your log still work.</p>
<p><a href="/guide" style="color:#0e3b2c">Open the field guide</a> · <a href="/log" style="color:#0e3b2c">Open your log</a></p>
</main></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function cacheFirst(request, name, maxEntries) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (maxEntries) await trim(cache, maxEntries);
  }
  return response;
}

// Oldest first: Cache Storage returns keys in insertion order.
async function trim(cache, maxEntries) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((k) => cache.delete(k)));
}
