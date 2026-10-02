<script setup lang="ts">
import ProfileView from '~/features/admin/views/ProfileView.vue';
definePageMeta({
  layout: 'admin',
  title: '我的账户',
  key: (route) => route.path,
});
</script>
<template>
  <ProfileView />
</template>
