<script setup lang="ts">
import TagView from '~/features/admin/views/TagView.vue';
definePageMeta({ layout: 'admin', title: '标签', key: (route) => route.path });
</script>
<template>
  <TagView />
</template>
