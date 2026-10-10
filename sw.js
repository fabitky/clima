const CACHE = 'bolson-clima-1.19.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/storage.js',
  './js/sun.js',
  './js/fire.js',
  './js/sky.js',
  './js/alerts.js',
  './js/initial-forecast.js',
  './js/data-fetcher.js',
  './js/fire-emergency.js',
  './js/app.js',
  './data/climate-baseline.json',
  './data/historical.json',
  './leaflet/leaflet.js',
  './leaflet/leaflet.css'
];

// ==========================================
// INSTALL: cachea uno por uno, sin abortar si falla alguno
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const resultados = await Promise.allSettled(
      ASSETS.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (!resp.ok) {
            console.warn('[SW] Falló al cachear:', url, resp.status);
            return;
          }
          await cache.put(url, resp);
        } catch (e) {
          console.warn('[SW] Error cacheando:', url, e.message);
        }
      })
    );
    const ok = resultados.filter(r => r.status === 'fulfilled').length;
    console.log(`[SW] Instalado. Archivos cacheados: ${ok}/${ASSETS.length}`);
    self.skipWaiting();
  })());
});

// ==========================================
// ACTIVATE: limpia cachés viejas
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ==========================================
// FETCH: cache-first con fallbacks
// ==========================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // APIs externas: network-first, fallback a caché
  if (
    url.hostname.includes('firms.modaps.eosdis.nasa.gov') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('argentina.gob.ar')
  ) {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Tiles del mapa: cache-first
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(req).then(r => {
        if (r) return r;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return resp;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Navegación (abrir la app): cache-first, fallback a index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(r => {
        if (r) return r;
        return fetch('./index.html').then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return resp;
        }).catch(() => caches.match('./'));
      })
    );
    return;
  }

  // Resto (assets locales): cache-first, fallback a red
  event.respondWith(
    caches.match(req).then(r => {
      if (r) return r;
      return fetch(req).then(resp => {
        if (resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});