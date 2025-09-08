/* eslint-env serviceworker */
/* global self, caches, fetch, Request, Response, Headers, URL */

// Service Worker for PDF Signer - Offline Support
const CACHE_NAME = 'pdf-signer-v1';
const RUNTIME_CACHE = 'pdf-signer-runtime-v1';

// Files to cache on install
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sample-nda.pdf',
  // Add more static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Caching static assets
        // Cache the static files
        return cache.addAll(STATIC_CACHE_FILES.map(url => {
          // Add cache-busting query parameter for development
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            // Deleting old cache
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests separately (network-first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets and HTML (cache-first)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
        }).catch(() => {
          // Silently fail if network is unavailable
        });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Network failed and no cache available
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // For other requests, return a generic offline response
        return new Response('Offline - Content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});

// Handle PDF caching with size limits
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PDF') {
    const { url, blob } = event.data;
    
    // Check blob size (limit to 50MB)
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
    
    if (blob.size > MAX_PDF_SIZE) {
      event.ports[0].postMessage({
        success: false,
        error: 'PDF too large for offline caching'
      });
      return;
    }

    // Cache the PDF blob
    caches.open(RUNTIME_CACHE).then((cache) => {
      const response = new Response(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': blob.size.toString()
        }
      });
      
      return cache.put(url, response);
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      event.ports[0].postMessage({
        success: false,
        error: error.message
      });
    });
  }

  // Handle cache cleanup request
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.keys();
    }).then((requests) => {
      // Remove PDFs older than 7 days
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const deletionPromises = requests.map((request) => {
        return caches.match(request).then((response) => {
          if (response) {
            const cachedTime = response.headers.get('sw-cached-time');
            if (cachedTime && parseInt(cachedTime) < weekAgo) {
              return caches.open(RUNTIME_CACHE).then(cache => cache.delete(request));
            }
          }
        });
      });
      return Promise.all(deletionPromises);
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      event.ports[0].postMessage({
        success: false,
        error: error.message
      });
    });
  }
});

// Background sync for saving work
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-annotations') {
    event.waitUntil(
      // Get pending annotations from IndexedDB and sync to server
      syncPendingAnnotations()
    );
  }
});

async function syncPendingAnnotations() {
  // This would sync with a backend API when available
  // For now, just log
  // Syncing pending annotations
  return Promise.resolve();
}