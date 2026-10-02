<script setup lang="ts">
import CollectionsView from '~/features/admin/views/CollectionsView.vue';
definePageMeta({ layout: 'admin', title: '友链', key: (route) => route.path });
</script>
<template>
  <CollectionsView kind="links" />
</template>
