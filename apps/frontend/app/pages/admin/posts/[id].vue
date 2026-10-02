<script setup lang="ts">
import EditorView from '~/features/admin/views/EditorView.vue';
definePageMeta({
  layout: 'admin',
  title: '文章编辑',
  key: (route) => route.path,
});
</script>
<template>
  <EditorView kind="posts" />
</template>
