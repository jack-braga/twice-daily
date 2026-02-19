import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  base: '/twice-daily/',
  server: {
    host: true, // expose to network for mobile testing
  },
  plugins: [
    react(),
    tailwindcss(),
    qrcode(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/bible\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bible-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/data\/(lectionary|psalter|liturgy)\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'liturgy-data',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Twice Daily',
        short_name: 'Twice Daily',
        description: 'The Anglican Daily Office',
        theme_color: '#1a1a2e',
        background_color: '#faf9f6',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
