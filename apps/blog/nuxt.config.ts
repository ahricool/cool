export default defineNuxtConfig({
  compatibilityDate: '2025-10-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  typescript: { strict: true },
  css: [
    '@fontsource/ubuntu/400.css',
    '@fontsource/ubuntu/700.css',
    '@fontsource/noto-sans-sc/chinese-simplified-400.css',
    '@fontsource/noto-sans-sc/chinese-simplified-700.css',
    'highlight.js/styles/github.css',
    '~/assets/adapters.css',
    '~/assets/refinements.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      bodyAttrs: { class: 'sakura-ui' },
      link: [{ rel: 'stylesheet', href: '/sakura/main.css' }],
    },
  },
  runtimeConfig: {
    apiBase: 'http://backend:3000/api/v1',
    public: { apiBase: '/api/v1' },
  },
  nitro: {
    devProxy: {
      '/api/': { target: 'http://127.0.0.1:3000/api/', changeOrigin: true },
    },
  },
});
