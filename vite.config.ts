import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Deployment workflows must choose their base explicitly. Inferring it from
  // GITHUB_ACTIONS also changes container builds that happen to run in CI.
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    global: 'globalThis',
  },
  plugins: [react()],
  build: {
    reportCompressedSize: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
