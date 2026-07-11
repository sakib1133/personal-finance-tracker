const CACHE_NAME = 'expense-tracker-v6'; // Force fresh install, clears stale cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing, version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache)
          .catch((error) => {
            // Some assets might fail (e.g., icons), continue anyway
            console.warn('Some cache assets failed to load:', error);
            return Promise.resolve();
          });
      })
      .then(() => {
        console.log('SW install completed, skipping wait...');
        self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
        self.skipWaiting();
      })
  );
});

// Fetch event - network-only for API, network-first with cache for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests - NEVER cache, always fetch fresh (pass through, no SW interference)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/expenses') ||
      url.pathname.startsWith('/budgets') ||
      url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/analytics')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Return a clone since the response can only be consumed once
          return response.clone();
        })
        .catch(() => {
          // Only cache fallback for GET requests, return error for others
          if (event.request.method === 'GET') {
            // Check if we have a cached response (unlikely for API, but safe)
            return caches.match(event.request).then(cached => {
              if (cached) {
                return cached;
              }
              return new Response(
                JSON.stringify({ error: 'Network error - offline' }),
                { 
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          }
          return new Response(
            JSON.stringify({ error: 'Network error - offline' }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone and cache the response for static assets
            const responseToCache = response.clone();

            if (event.request.method === 'GET') {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.warn('Failed to cache response:', error);
                });
            }

            return response;
          })
          .catch(() => {
            // If fetch fails and it's a navigation request, return cached index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Activate event - immediately take control and clean all old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating - current cache:', CACHE_NAME);
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log('Claiming clients...');
        return self.clients.claim();
      })
      .then(() => caches.keys())
      .then((cacheNames) => {
        console.log('Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName)
                .then(() => {
                  console.log('Deleted cache:', cacheName);
                })
                .catch((error) => {
                  console.warn('Failed to delete cache:', cacheName, error);
                });
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        console.log('Service Worker activation complete - ready to serve');
        return self.clients.matchAll();
      })
      .then((clients) => {
        console.log('Notifying', clients.length, 'clients of update');
        clients.forEach((client) => {
          try {
            client.postMessage({ type: 'SW_UPDATED' });
          } catch (error) {
            console.warn('Failed to post message to client:', error);
          }
        });
      })
      .catch((error) => {
        console.error('Error during activation:', error);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses());
  }
});

// Handle skip waiting message for PWA updates
self.addEventListener('message', (event) => {
  console.log('SW received message:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SKIP_WAITING message received, skipping wait...');
    self.skipWaiting();
  }
});

async function syncExpenses() {
  // Handle syncing offline expenses when connection is restored
  console.log('Syncing expenses...');
  // Implementation would sync offline data to server
}
