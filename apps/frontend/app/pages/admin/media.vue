<script setup lang="ts">
import MediaView from '~/features/admin/views/MediaView.vue';
definePageMeta({
  layout: 'admin',
  title: '媒体库',
  key: (route) => route.path,
});
</script>
<template>
  <MediaView />
</template>
