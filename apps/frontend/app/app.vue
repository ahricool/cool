<script setup lang="ts">
const route = useRoute();
const store = useSiteStore();
const pagePatternSeed = useState('page-pattern-seed', () =>
  Math.random().toString(36).slice(2),
);
onMounted(() => void store.load());
const { locale, contentLang } = useCoolI18n();
const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
useHead(() => ({
  htmlAttrs: {
    lang: contentLang(locale.value),
    'data-surface': isAdmin.value ? 'admin' : 'blog',
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
