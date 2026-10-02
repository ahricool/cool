<script setup lang="ts">
definePageMeta({
  validate: (route) =>
    route.params.locale === 'en' || route.params.locale === 'zh',
});
</script>
<template><NuxtPage /></template>
