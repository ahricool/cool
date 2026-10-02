<script setup lang="ts">
import CommentsView from '~/features/admin/views/CommentsView.vue';
definePageMeta({
  layout: 'admin',
  title: '评论审核',
  key: (route) => route.path,
});
</script>
<template>
  <CommentsView />
</template>
