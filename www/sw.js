// ====================================================================
// DAEMONX MUSIC - SERVICE WORKER v1.3 (iOS Optimized)
// Mantiene el ciclo de vida del reproductor y caché de recursos
// ====================================================================

const CACHE_NAME = 'daemonx-music-v1.3-ios';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.png',
  '/apple-touch-icon.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
      )
    ])
  );
});

// Interceptar peticiones con estrategia Network-First para datos siempre frescos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Omitir peticiones de streaming de audio, APIs dinámicas y bases de datos
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
