const CACHE_NAME = 'expense-tracker-v4'; // Force new installation
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Fetch event - network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests - NEVER cache, always fetch fresh
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/expenses') ||
      url.pathname.startsWith('/budgets') ||
      url.pathname.startsWith('/auth')) {
    
    // For GET requests, add timestamp to prevent browser caching
    let fetchUrl = event.request.url;
    if (event.request.method === 'GET') {
      const urlObj = new URL(event.request.url);
      urlObj.searchParams.set('_t', Date.now());
      fetchUrl = urlObj.toString();
    }
    
    const fetchRequest = new Request(fetchUrl, {
      method: event.request.method,
      headers: event.request.headers,
      body: event.request.body,
      credentials: 'include'
    });
    
    event.respondWith(
      fetch(fetchRequest)
        .then(response => {
          // Return fresh response, never cache API calls
          return response.clone();
        })
        .catch(() => {
          // Offline fallback only for GET
          if (event.request.method === 'GET') {
            return caches.match(event.request);
          }
          // For mutations, fail immediately (don't return stale data)
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
      .then(() => caches.keys())
      .then((cacheNames) => {
        console.log('Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        console.log('Claiming clients...');
        return self.clients.claim();
      })
      .then(() => {
        console.log('Service Worker activation complete');
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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function syncExpenses() {
  // Handle syncing offline expenses when connection is restored
  console.log('Syncing expenses...');
  // Implementation would sync offline data to server
}
