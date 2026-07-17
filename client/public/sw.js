const CACHE_NAME = 'expense-tracker-v7';

const urlsToCache = [
'/',
'/index.html',
'/manifest.json',
'/icon-192x192.png',
'/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
console.log('Service Worker installing, version:', CACHE_NAME);

event.waitUntil(
caches
.open(CACHE_NAME)
.then((cache) => {
console.log('Opened cache:', CACHE_NAME);

    return cache.addAll(urlsToCache).catch((error) => {
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

// Fetch event
self.addEventListener('fetch', (event) => {
const url = new URL(event.request.url);

// API requests & private/authenticated content: never cache
if (
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/auth') ||
  url.pathname.startsWith('/expenses') ||
  url.pathname.startsWith('/budgets') ||
  url.pathname.startsWith('/analytics') ||
  event.request.headers.get('authorization') ||
  /[?&](token|jwt)=/i.test(url.search)
) {
event.respondWith(
fetch(event.request).catch(() => {
return new Response(
JSON.stringify({
error: 'Network error - offline'
}),
{
status: 503,
headers: {
'Content-Type': 'application/json'
}
}
);
})
);

return;

}

// Static assets + React routes
event.respondWith(
caches.match(event.request).then((cachedResponse) => {
if (cachedResponse) {
return cachedResponse;
}

  return fetch(event.request)
    .then((networkResponse) => {
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }

      if (event.request.method === 'GET') {
        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch((err) => {
            console.warn('Failed to cache response:', err);
          });
        });
      }

      return networkResponse;
    })
    .catch(async () => {
      // React Router routes like /login, /analytics, etc.
      if (event.request.mode === 'navigate') {
        const cachedIndex = await caches.match('/index.html');

        if (cachedIndex) {
          return cachedIndex;
        }

        return new Response(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Offline</title>
          </head>
          <body>
            <h1>Offline</h1>
            <p>Please check your internet connection.</p>
          </body>
          </html>
          `,
          {
            status: 503,
            headers: {
              'Content-Type': 'text/html'
            }
          }
        );
      }

      return new Response('Network Error', {
        status: 503,
        statusText: 'Offline'
      });
    });
})

);
});

// Activate event
self.addEventListener('activate', (event) => {
console.log('Service Worker activating - current cache:', CACHE_NAME);

const cacheWhitelist = [CACHE_NAME];

event.waitUntil(
caches
.keys()
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
  .then(() => self.clients.claim())
  .then(() => self.clients.matchAll())
  .then((clients) => {
    console.log('Notifying', clients.length, 'clients of update');

    clients.forEach((client) => {
      try {
        client.postMessage({
          type: 'SW_UPDATED'
        });
      } catch (error) {
        console.warn('Failed to notify client:', error);
      }
    });
  })
  .catch((error) => {
    console.error('Activation error:', error);
  })

);
});

// Background Sync
self.addEventListener('sync', (event) => {
if (event.tag === 'sync-expenses') {
event.waitUntil(syncExpenses());
}
});

// Messages
self.addEventListener('message', (event) => {
console.log('SW received message:', event.data);

if (event.data?.type === 'SKIP_WAITING') {
self.skipWaiting();
}
});

async function syncExpenses() {
console.log('Syncing expenses...');
}
