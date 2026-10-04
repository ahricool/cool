import surfaceStyles from './build/surface-styles';

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
    '~/assets/tokens.css',
    '~/assets/blog/base.css',
    '~/assets/blog/shell.css',
    '~/assets/blog/content.css',
    'element-plus/dist/index.css',
    '~/assets/admin/shell.css',
    '~/assets/admin/workspace.css',
    '~/assets/admin/editor.css',
    '~/assets/admin/login.css',
  ],
  app: { head: { htmlAttrs: { lang: 'en' } } },
  runtimeConfig: { public: { apiBase: '/api/v1' } },
  vite: { css: { postcss: { plugins: [surfaceStyles()] } } },
  nitro: {
    prerender: { routes: ['/'], crawlLinks: false },
    devProxy: {
      '/api/': { target: 'http://127.0.0.1:3000/api/', changeOrigin: true },
    },
  },
});
