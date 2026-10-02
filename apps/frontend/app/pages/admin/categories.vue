<script setup lang="ts">
import TaxonomyView from '~/features/admin/views/TaxonomyView.vue';
definePageMeta({ layout: 'admin', title: '分类', key: (route) => route.path });
</script>
<template>
  <TaxonomyView kind="categories" />
</template>
