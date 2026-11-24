import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capture install availability globally so app screens can react to browser support.
window.addEventListener('beforeinstallprompt', (event) => {
  window.__menuosInstallPrompt = event;
  window.dispatchEvent(new Event('menuosinstallprompt'));
});

window.addEventListener('appinstalled', () => {
  window.__menuosInstallPrompt = null;
  window.dispatchEvent(new Event('menuosappinstalled'));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// vite-plugin-pwa handles SW registration automatically
// Only Firebase messaging SW needs manual registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`, {
      scope: `${import.meta.env.BASE_URL}fcm/`
    })
      .then(reg => console.log('[Admin Firebase SW] Registered for push notifications'))
      .catch(err => console.warn('[Admin Firebase SW] Non-critical:', err.message));
  });
}
