// v61 — Add Railway domain support
const CACHE_VERSION = 'v61';
const CACHE_NAME = 'trackinn-' + CACHE_VERSION;

const PRE_CACHE = [
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
];

// URLs that should NEVER be cached
function shouldSkipCache(url) {
  if (url.includes('/api/')) return true;
  if (url.includes('algolia.net')) return true;
  if (url.includes('algolianet.com')) return true;
  if (url.includes('algolia.io')) return true;
  return false;
}

// URLs that are static CDN assets (cache-first)
function isStaticAsset(url) {
  return url.includes('unpkg.com') ||
         url.includes('cdn.sheetjs.com') ||
         url.includes('cdn.jsdelivr.net') ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com');
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache API or Algolia requests
  if (shouldSkipCache(url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // CDN/external libs + fonts: Cache-first (they never change)
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // index.html and local files: Network-first, cache as fallback
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
