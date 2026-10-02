<script setup lang="ts">
import CollectionsView from '~/features/admin/views/CollectionsView.vue';
definePageMeta({ layout: 'admin', title: '图库', key: (route) => route.path });
</script>
<template>
  <CollectionsView kind="photos" />
</template>
