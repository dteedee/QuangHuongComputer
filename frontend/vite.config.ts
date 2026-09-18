import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@context': path.resolve(__dirname, './src/context'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@lib': path.resolve(__dirname, './src/lib'),
    }
  },
  server: {
    headers: {
      // Allow Google Sign-In popup to communicate with main window
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    }
  },
  build: {
    // Chunk size warning limit (default is 500kB)
    chunkSizeWarningLimit: 600,
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Only list packages that are actually imported from src/. A name that
        // no module imports is a phantom entry: Rollup cannot resolve it and
        // the chunk silently never materialises. The five @radix-ui packages
        // that used to sit in `vendor-ui` had 0 importers (grep -rn "from
        // '@radix-ui/…'" src/ -> 0); they go back in when the UI kit (W1-12)
        // starts using them.
        manualChunks: {
          // Vendor chunk for React and related
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI components chunk
          'vendor-ui': ['lucide-react'],
          // Data fetching & forms
          'vendor-data': [
            '@tanstack/react-query',
            'axios',
            'react-hook-form',
            'zod',
          ],
          // Charts & visualization
          'vendor-charts': ['recharts'],
          // Rich text editor
          'vendor-editor': ['react-quill', 'dompurify'],
          // Real-time communication ('socket.io-client' dropped: 0 importers)
          'vendor-realtime': ['@microsoft/signalr'],
          // Animation
          'vendor-animation': ['framer-motion'],
        },
      },
    },
    // Enable source maps for debugging (disable in production)
    sourcemap: false,
    // Minification options
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
    ],
  },
})
