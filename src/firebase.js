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
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration
      });
      
      if (token) {
        console.log('FCM Token retrieved:', token);
        await api.notifications.registerToken(token, role);
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
