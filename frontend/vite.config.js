import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'AgroSens — Irrigation de précision',
        short_name: 'AgroSens',
        description: "Application IoT d'irrigation de précision - USSEIN Kaolack",
        start_url: '/',
        display: 'standalone',
        background_color: '#1b5e20',
        theme_color: '#1b5e20',
        orientation: 'portrait',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}']
      }
    })
  ]
})
