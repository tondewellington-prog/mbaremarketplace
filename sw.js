// Service Worker for Mbare Marketplace
const CACHE_NAME = 'mbare-cache-v6'; // Incremented version to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/product-detail.html',
  '/Basket.html',
  '/checkout.html',
  '/seller-register.html',
  '/seller-dashboard.html',
  '/rate-seller.html',
  '/search-results.html',
  '/analytics.html',
  '/styles.css',
  '/script.js',
  '/api.js',
  '/auth-check.js',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Install event - cache all static assets with error handling
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        // Use Promise.allSettled to handle individual file failures
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error.message);
              // Return a resolved promise to continue even if one file fails
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
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

  // Skip Chrome extension requests
  if (event.request.url.includes('chrome-extension')) {
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
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the fetched response (don't wait for it)
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache).catch(err => {
                  console.warn('Failed to cache:', event.request.url, err.message);
                });
              })
              .catch(err => {
                console.warn('Failed to open cache:', err.message);
              });

            return response;
          })
          .catch(error => {
            console.warn('Fetch failed:', error.message);
            
            // Return offline page for HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html').catch(() => {
                return new Response('You are offline. Please check your connection.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' }
                });
              });
            }
            
            // Return a simple error for other requests
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
  if (!event.data) return;
  
  const title = 'Mbare Marketplace';
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Handle service worker errors
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});
