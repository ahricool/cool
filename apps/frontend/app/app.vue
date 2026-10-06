<script setup lang="ts">
import { resolveSiteTheme, siteThemeCss } from '~/themes/registry';
const route = useRoute();
const dark = useCoolTheme();
const store = useSiteStore();
const pagePatternSeed = useState('page-pattern-seed', () =>
  Math.random().toString(36).slice(2),
);
onMounted(() => void store.load());
const { locale, contentLang } = useCoolI18n();
const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
useHead(() => ({
  htmlAttrs: {
    class: dark.value ? 'dark' : '',
    lang: contentLang(locale.value),
    'data-surface': isAdmin.value ? 'admin' : 'blog',
    'data-font': store.loaded ? store.site.appearance.font : undefined,
    'data-site-theme': resolveSiteTheme(store.site.appearance.themeId).id,
    style: `${siteThemeCss(store.site.appearance.themeId, dark.value)} --sakura-font-scale: ${store.site.appearance.fontSize / 100}`,
  },
  bodyAttrs: { class: isAdmin.value ? 'admin-ui' : 'sakura-ui' },
}));
</script>
<template>
  <div class="app-surface">
    <SakuraPattern
      v-if="store.site.appearance.background !== 'none'"
      :shape="store.site.appearance.background"
      :seed="pagePatternSeed"
      class="page-pattern"
    />
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </div>
</template>

<style scoped>
.app-surface {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
}
</style>
