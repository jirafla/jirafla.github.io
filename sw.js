// v2: el service worker solo atiende la app de inglés. Antes, con scope "/", guardaba en caché
// cualquier archivo del dominio y dejaba el portfolio viejo pegado a quien había usado la app.
const CACHE = 'english-app-v2';
const APP_PAGES = ['/menu.html', '/verbos.html', '/phrasal-verbs.html', '/objetos.html'];
const SHELL = [
  ...APP_PAGES,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/css/bootstrap.min.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// Borra los cachés anteriores (english-app-v1 tenía copias del portfolio)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ¿La pide la app de inglés? Sus páginas, o cualquier recurso que carguen esas páginas
function belongsToApp(request) {
  const url = new URL(request.url);
  if (url.origin === self.location.origin && SHELL.includes(url.pathname)) return true;
  if (request.mode === 'navigate' || !request.referrer) return false;
  const referrer = new URL(request.referrer);
  return referrer.origin === self.location.origin && APP_PAGES.includes(referrer.pathname);
}

self.addEventListener('fetch', e => {
  // El portfolio y todo lo demás van directo a la red, sin pasar por aquí
  if (e.request.method !== 'GET' || !belongsToApp(e.request)) return;

  const url = new URL(e.request.url);
  // CDN resources: network-first, fall back to cache
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Local resources: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
