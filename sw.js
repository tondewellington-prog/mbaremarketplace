// Service Worker for Mbare Marketplace
const CACHE_NAME = 'mbare-cache-v1';
const urlsToCache = [
  '/mbaremarketplace/',
  '/mbaremarketplace/index.html',
  '/mbaremarketplace/login.html',
  '/mbaremarketplace/register.html',
  '/mbaremarketplace/product-detail.html',
  '/mbaremarketplace/Basket.html',
  '/mbaremarketplace/checkout.html',
  '/mbaremarketplace/seller-register.html',
  '/mbaremarketplace/seller-dashboard.html',
  '/mbaremarketplace/rate-seller.html',
  '/mbaremarketplace/search-results.html',
  '/mbaremarketplace/analytics.html',
  '/mbaremarketplace/styles.css',
  '/mbaremarketplace/script.js',
  '/mbaremarketplace/api.js',
  '/mbaremarketplace/auth-check.js',
  '/mbaremarketplace/manifest.json',
  '/mbaremarketplace/icons/icon-72.png',
  '/mbaremarketplace/icons/icon-96.png',
  '/mbaremarketplace/icons/icon-128.png',
  '/mbaremarketplace/icons/icon-144.png',
  '/mbaremarketplace/icons/icon-152.png',
  '/mbaremarketplace/icons/icon-192.png',
  '/mbaremarketplace/icons/icon-384.png',
  '/mbaremarketplace/icons/icon-512.png'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => {
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/mbaremarketplace/index.html');
            }
            
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const title = 'Mbare Marketplace';
  const options = {
    body: event.data.text(),
    icon: '/mbaremarketplace/icons/icon-192.png',
    badge: '/mbaremarketplace/icons/icon-72.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/mbaremarketplace/')
  );
});
