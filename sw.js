// Cachar AI-modellen så den bara laddas ner en gång.
// Appens egna filer hämtas alltid färska från nätet först (så uppdateringar syns direkt).
const CACHE = 'bilstudio-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const own = url.origin === location.origin;
  const lib = /(^|\.)staticimgly\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'esm.sh';
  if (!own && !lib) return;

  if (own) {
    // Nätverk först, cache som reserv
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // Cache först för stora filer (AI-modell, bibliotek)
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }))
    );
  }
});
