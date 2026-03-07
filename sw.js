const CACHE_NAME = 'mbare-cache-v1';
const urlsToCache = [
  '/mbaremarketplace/',
  '/mbaremarketplace/index.html',
  '/mbaremarketplace/styles.css',
  '/mbaremarketplace/script.js',
  '/mbaremarketplace/api.js',
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
