<script setup lang="ts">
const { localePath } = useCoolI18n();
const route = useRoute();
await navigateTo(
  {
    path: localePath('/'),
    query: route.query,
    hash: route.hash,
  },
  { replace: true },
);
</script>
<template><div /></template>
