importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCjgJEmSAdYQOko5K7DIof88BUrVt7kVIk",
  authDomain: "qr-menu-sass-59572.firebaseapp.com",
  projectId: "qr-menu-sass-59572",
  storageBucket: "qr-menu-sass-59572.firebasestorage.app",
  messagingSenderId: "1009330358421",
  appId: "1:1009330358421:web:6c6ecac899091cb046739c",
  measurementId: "G-R275KDJ5FB"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // If the push message already includes a notification payload,
  // Firebase SDK and Chrome Web Push handle the display automatically.
  // Calling self.registration.showNotification here creates an unnecessary duplicate popup.
  if (payload.notification) {
    return;
  }

  const tag = (payload.data && (
    payload.data.orderId ? `order-${payload.data.orderId}` :
    payload.data.callId ? `call-${payload.data.callId}` :
    payload.data.tag || payload.data.alertId
  )) || 'menuos-alert';

  const notificationTitle = payload.data?.title || 'Stitch Admin Panel';
  const notificationOptions = {
    body: payload.data?.body || '',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    tag: tag,
    renotify: false,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// PWA Caching and Fetch Handler
const CACHE_NAME = 'menuos-admin-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
