import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { api } from './api';

const firebaseConfig = {
  apiKey: "AIzaSyCjgJEmSAdYQOko5K7DIof88BUrVt7kVIk",
  authDomain: "qr-menu-sass-59572.firebaseapp.com",
  projectId: "qr-menu-sass-59572",
  storageBucket: "qr-menu-sass-59572.firebasestorage.app",
  messagingSenderId: "1009330358421",
  appId: "1:1009330358421:web:6c6ecac899091cb046739c",
  measurementId: "G-R275KDJ5FB"
};

const app = initializeApp(firebaseConfig);
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('FCM messaging is not supported in this browser environment:', error);
}

export const requestFirebaseNotificationPermission = async (role = 'restaurant') => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const legacyScope = new URL(`${import.meta.env.BASE_URL}fcm/`, window.location.origin).href;
      const legacyRegistration = await navigator.serviceWorker.getRegistration(legacyScope);
      let legacyToken = null;
      if (legacyRegistration?.scope === legacyScope) {
        try {
          legacyToken = await getToken(messaging, { serviceWorkerRegistration: legacyRegistration });
        } catch (error) {
          console.warn('Could not read the previous shared notification subscription:', error);
        }
      }

      // Each panel owns a separate worker registration and FCM token. Muting
      // Admin can therefore never mute Counter on the same browser.
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}firebase-messaging-sw.js`,
        { scope: `${import.meta.env.BASE_URL}fcm/${role}/` }
      );
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration
      });
      
      if (token) {
        console.log('FCM Token retrieved:', token);
        localStorage.setItem(`menuos_fcm_token_${role}`, token);
        await api.notifications.registerToken(token, role);
        if (legacyToken && legacyToken !== token) {
          await api.notifications.deregisterRole(legacyToken).catch(error => console.warn('Could not migrate previous notification subscription:', error));
        }
        return token;
      }
    } else {
      console.warn('Notification permission was not granted.');
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
      resolve(payload);
    });
  });
