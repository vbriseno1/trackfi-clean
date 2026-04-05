import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  define: {
    __TRACKFI_APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // Broader browser support (covers older Android WebView, Safari 14+)
    target: 'es2015',

    // Suppress warnings for the large App.jsx chunk (known monolith for now)
    chunkSizeWarningLimit: 1200,

    rollupOptions: {
      output: {
        // Split vendor libraries into their own cached chunks.
        // When you update app code, users only re-download the app chunk —
        // recharts and lucide stay cached from the previous deploy.
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-lucide':   ['lucide-react'],
          'vendor-sentry':   ['@sentry/react'],
        },
      },
    },
  },
})
