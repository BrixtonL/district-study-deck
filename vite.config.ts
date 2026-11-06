import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Pages supplies /repository/ (or / for a user site/custom domain).
const base = process.env.BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('//') || base.includes('..') || /[?#\\]/.test(base)) {
  throw new Error('BASE_PATH must be an absolute path ending in /, such as /district-study-deck/.');
}
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    scope: base,
    includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      name: 'District Study Deck', short_name: 'Study Deck', description: 'Your district, committed to memory.',
      id: base, start_url: base, scope: base, display: 'standalone', background_color: '#f4f5f1', theme_color: '#174d3c',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: { clientsClaim: true, globPatterns: ['**/*.{js,css,html,png,webmanifest}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, navigateFallback: 'index.html', cleanupOutdatedCaches: true },
  })],
  server: { fs: { strict: true, allow: [process.cwd()] } },
});
