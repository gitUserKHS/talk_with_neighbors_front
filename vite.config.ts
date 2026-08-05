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
    rollupOptions: {
      output: {
        // 거의 바뀌지 않는 의존성을 앱 코드와 분리해, 배포할 때마다 프레임워크까지
        // 다시 내려받지 않도록 한다.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) {
            return 'vendor-mui';
          }
          if (/[\\/]node_modules[\\/](@reduxjs|react-redux|redux|redux-thunk|reselect)[\\/]/.test(id)) {
            return 'vendor-redux';
          }
          if (/[\\/]node_modules[\\/](@stomp|sockjs-client|axios)[\\/]/.test(id)) {
            return 'vendor-network';
          }
          return undefined;
        },
      },
    },
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
