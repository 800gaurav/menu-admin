import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// vite-plugin-pwa registers the app worker. Firebase workers are registered
// lazily with role-specific scopes from firebase.js so Admin and Counter
// subscriptions remain independent on the same browser installation.
