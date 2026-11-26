import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const devBaseRedirectPlugin = () => ({
  name: 'dev-base-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const rawUrl = req.url || '';
      const [pathname, search] = rawUrl.split('?');
      const query = search ? `?${search}` : '';

      if (
        pathname.startsWith('/counter') ||
        pathname.startsWith('/kitchen') ||
        pathname === '/' ||
        pathname === '/login' ||
        pathname.startsWith('/login')
      ) {
        res.writeHead(302, { Location: `/admin${pathname}${query}` });
        res.end();
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  base: '/admin/',
  plugins: [
    devBaseRedirectPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,        // ← Works in dev mode too!
        type: 'module'
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'MenuOS Admin Dashboard',
        short_name: 'AdminOS',
        description: 'Restaurant Admin Panel — Manage orders, menu, staff and analytics',
        theme_color: '#003b1b',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'any',
        scope: '/admin/',
        start_url: '/admin/',
        icons: [
          {
            src: '/admin/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/admin/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:5000\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5175,
    strictPort: true
  }
})
