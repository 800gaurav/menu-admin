import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// vite-plugin-pwa handles SW registration automatically
// Only Firebase messaging SW needs manual registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('[Admin Firebase SW] Registered for push notifications'))
      .catch(err => console.warn('[Admin Firebase SW] Non-critical:', err.message));
  });
}
