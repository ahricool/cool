<script setup lang="ts">
import DashboardView from '~/features/admin/views/DashboardView.vue';
definePageMeta({ layout: 'admin', title: '概览', key: (route) => route.path });
</script>
<template>
  <DashboardView />
</template>
