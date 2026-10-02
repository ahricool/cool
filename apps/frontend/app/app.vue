<script setup lang="ts">
const route = useRoute();
const isAdmin = computed(() => /^\/admin(?:\/|$)/.test(route.path));
useHead(() => ({
  htmlAttrs: { 'data-surface': isAdmin.value ? 'admin' : 'blog' },
  bodyAttrs: { class: isAdmin.value ? 'admin-ui' : 'sakura-ui' },
}));
</script>
<template>
  <NuxtLayout><NuxtPage /></NuxtLayout>
</template>
