/**
 * CreatorNew Progressive Web App (PWA) Service Worker
 * Strategy:
 * - Shell Assets & Images: Stale-While-Revalidate
 * - Page Navigations (HTML): Network-First with Offline Cache Fallback
 * - Heavy Neural Models (ONNX/WASM): Pass-through without CacheStorage bloat
 */

const CACHE_NAME = 'creatornew-shell-v1';

const STATIC_SHELL = [
  '/',
  '/index.html',
  '/404.html',
  '/creatornew-logo.webp',
  '/creatornew-logo.png',
  '/creatornew-icon.png',
  '/hero-creator.webp',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_SHELL).catch((err) => {
          console.warn('[SW] Pre-caching partial failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass heavy AI weights and ONNX runtime WASM from Service Worker CacheStorage
  if (
    url.pathname.endsWith('.onnx') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.includes('/models/')
  ) {
    return;
  }

  // Handle navigation requests (HTML pages): Network-First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/404.html');
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, WebP, PNG, SVG, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin ||
              url.hostname.includes('fonts.gstatic.com') ||
              url.hostname.includes('fonts.googleapis.com'))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
