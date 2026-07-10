// Combined Service Worker (PWA Caching, Offline Support, standard Push Notifications, and Firebase Cloud Messaging)
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDrv7Wdx3ezGXFcMEX0lg-YJXxnNRkrz_Y",
  authDomain: "bestlove-d293c.firebaseapp.com",
  projectId: "bestlove-d293c",
  storageBucket: "bestlove-d293c.firebasestorage.app",
  messagingSenderId: "730381175130",
  appId: "1:730381175130:web:40db41380b037d16d0cb63"
};

// Initialize Firebase App and Messaging in Service Worker
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[Service Worker] Received FCM background message ', payload);
    const notificationTitle = payload.notification?.title || "New Confession! ✨";
    const notificationOptions = {
      body: payload.notification?.body || "Someone sent you a message.",
      icon: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444',
      badge: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444',
      data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn("FCM initialisation failed in Service Worker:", err);
}

// --- PWA CACHING AND OFFLINE SUPPORT ---
const CACHE_NAME = 'heartspark-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first for fonts
  if (request.destination === 'font' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Handle standard push notification events
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "New Confession! ✨", body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || "New Confession! ✨";
  const options = {
    body: data.body || data.notification?.body || "Someone sent you a secret message.",
    icon: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444',
    badge: 'https://api.iconify.design/lucide:heart.svg?color=%23ef4444',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click to focus or open the messaging page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let targetUrl = '/messages';
  const notificationData = event.notification.data || {};
  if (notificationData.chatId || notificationData.storyId || notificationData.sparkId) {
    const cid = notificationData.chatId || notificationData.storyId || notificationData.sparkId;
    targetUrl = `/messages?id=${cid}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
