<script setup lang="ts">
import TaxonomyView from '~/features/admin/views/TaxonomyView.vue';
definePageMeta({ layout: 'admin', title: '标签', key: (route) => route.path });
</script>
<template>
  <TaxonomyView kind="tags" />
</template>
