<script setup lang="ts">
import SettingsView from '~/features/admin/views/SettingsView.vue';
definePageMeta({
  layout: 'admin',
  title: '网站配置',
  key: (route) => route.path,
});
</script>
<template>
  <SettingsView />
</template>
