<script setup lang="ts">
import PostsView from '~/features/admin/views/PostsView.vue';
definePageMeta({ layout: 'admin', title: '内容', key: (route) => route.path });
</script>
<template>
  <PostsView kind="posts" />
</template>
