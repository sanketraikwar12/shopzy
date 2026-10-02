import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // Keeps the browser same-origin in dev: no CORS preflights, cookies just work.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/static': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks so a code change doesn't invalidate the whole bundle.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          map: ['leaflet'],
        },
      },
    },
  },
});
