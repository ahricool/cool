<script setup lang="ts">
import LoginView from '~/features/admin/views/LoginView.vue';
definePageMeta({
  layout: 'admin',
  title: '站长登录',
  key: (route) => route.path,
});
</script>
<template>
  <LoginView />
</template>
