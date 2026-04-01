import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Output directly into Strapi's public/app so the backend can serve it
    outDir: resolve(__dirname, '../public/app'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Proxy API calls to the Strapi backend during development
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
    },
  },
});
