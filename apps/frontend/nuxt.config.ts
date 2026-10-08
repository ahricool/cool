import surfaceStyles from './build/surface-styles';

export default defineNuxtConfig({
  compatibilityDate: '2025-10-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  typescript: { strict: true },
  css: [],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
    },
  },
  runtimeConfig: { public: { apiBase: '/api/v1' } },
  vite: { css: { postcss: { plugins: [surfaceStyles()] } } },
  nitro: {
    prerender: { routes: ['/'], crawlLinks: false },
    devProxy: {
      '/api/': { target: 'http://127.0.0.1:3000/api/', changeOrigin: true },
    },
  },
});
