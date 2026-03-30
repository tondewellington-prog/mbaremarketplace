// Service Worker for Mbare Marketplace
const CACHE_NAME = 'mbare-cache-v7'; // Incremented version to force update
const STATIC_CACHE_NAME = 'mbare-static-v1';

// Files that should ALWAYS come from network first (never cached)
const NETWORK_FIRST_URLS = [
  '/index.html',
  '/script.js',
  '/api.js',
  '/auth-check.js',
  '/styles.css',
  '/manifest.json'
];

// Files that can be cached for offline use
const CACHE_FIRST_URLS = [
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return Promise.allSettled(
          CACHE_FIRST_URLS.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error.message);
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

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== STATIC_CACHE_NAME && cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - Network-first for critical files, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.includes('chrome-extension')) {
    return;
  }

  // Check if this URL should use network-first strategy (always get fresh version)
  const isNetworkFirst = NETWORK_FIRST_URLS.some(fileUrl => 
    url.endsWith(fileUrl) || url.includes(fileUrl)
  );

  if (isNetworkFirst) {
    // NETWORK FIRST STRATEGY - Always try network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If fetch succeeds, update cache with new version
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(error => {
          console.warn('Network failed, falling back to cache for:', url);
          // If network fails, try cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback
            return new Response('You are offline. Please check your connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
  } else {
    // CACHE FIRST STRATEGY - For static assets (icons, images)
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version, but update in background
            fetch(event.request).then(networkResponse => {
              caches.open(STATIC_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }).catch(() => {});
            return cachedResponse;
          }
          
          // If not in cache, fetch from network
          return fetch(event.request)
            .then(networkResponse => {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
              return networkResponse;
            })
            .catch(error => {
              console.warn('Fetch failed for:', url);
              return new Response('Resource not available', {
                status: 404,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
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
