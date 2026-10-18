import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// base relative : l'app marche aussi bien à la racine (Netlify) que dans un sous-dossier (GitHub Pages).
export default defineConfig(({ mode }) => ({
  base: './',
  // Mode « artefact » : la page tourne dans claude.ai, sans service worker (refusé par le cadre).
  build: mode === 'artefact' ? { outDir: 'dist-artefact' } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    mode === 'artefact' ? null : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-180.png'],
      manifest: {
        name: 'Coach 12 semaines',
        short_name: 'Coach 12',
        description: 'Suivi sportif perso : kettlebell, course, énergie. Données sur le téléphone uniquement.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#161914',
        theme_color: '#161914',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
}))
