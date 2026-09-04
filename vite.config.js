import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// IMPORTANT: change "base" to match your GitHub repository name,
// e.g. if your repo is https://github.com/yourname/lottee-bill-app
// then base should be '/lottee-bill-app/'
// If you deploy to Firebase Hosting instead, set base to '/'.
export default defineConfig({
  base: '/lottee-bill-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Quản Lý Bill Lottee',
        short_name: 'Bill Lottee',
        description: 'Ứng dụng quản lý bill giao hàng Lottee cho shipper',
        theme_color: '#0f3d3e',
        background_color: '#f5f2ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/lottee-bill-app/',
        scope: '/lottee-bill-app/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/__/]
      }
    })
  ]
})
