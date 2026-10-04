<script setup lang="ts">
const route = useRoute();
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
    <SakuraPattern />
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
