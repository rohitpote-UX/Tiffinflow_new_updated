/**
 * BiteBuddy 2.0 — Production Service Worker
 * Handles Web Push, Actionable Notifications, Static Caching & Offline Fallbacks
 */

const CACHE_NAME = 'bitebuddy-v2.0';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
];

// Install: Cache offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Stale-while-revalidate for static assets
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Push: Handle Incoming Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: '🍱 BiteBuddy Update',
    body: "Tomorrow's lunch is open. Tap to confirm your meal!",
    url: '/app',
    tag: 'bitebuddy-meal-reminder',
    renotify: true,
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge.png',
    tag: data.tag || 'bitebuddy-meal-reminder',
    renotify: data.renotify !== undefined ? data.renotify : true,
    vibrate: [100, 50, 100],
    data: {
      url: (data.data && data.data.url) || data.url || '/app',
      date: (data.data && data.data.date) || data.date,
      stage: (data.data && data.data.stage) || data.stage,
    },
    actions: data.actions || [
      { action: 'confirm-veg', title: '🥦 Veg' },
      { action: 'confirm-nonveg', title: '🍗 Non-Veg' },
      { action: 'open-app', title: 'Open App' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click: Handle action button taps or notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = (event.notification.data && event.notification.data.url) || '/app';

  if (action === 'confirm-veg' || action === 'confirm-nonveg') {
    const mealType = action === 'confirm-veg' ? 'veg' : 'non-veg';
    // Actionable push background confirmation
    event.waitUntil(
      fetch('/api/meals/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          date: event.notification.data.date || new Date().toISOString().split('T')[0],
        }),
      }).then(() => {
        return self.registration.showNotification('✓ Meal Confirmed!', {
          body: `Your ${mealType === 'veg' ? '🥦 Veg' : '🍗 Non-Veg'} meal has been confirmed.`,
          icon: '/icons/icon-192.png',
        });
      }).catch(() => {
        return clients.openWindow(targetUrl);
      })
    );
    return;
  }

  // Open / Focus existing client window and navigate to target URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && !client.url.endsWith(targetUrl) && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
