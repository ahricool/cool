<script setup lang="ts">
import PostsView from '~/features/admin/views/PostsView.vue';
definePageMeta({
  layout: 'admin',
  title: '独立页面',
  key: (route) => route.path,
});
</script>
<template>
  <PostsView kind="pages" />
</template>
