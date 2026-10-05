<script setup lang="ts">
import AlbumsView from '~/features/admin/views/AlbumsView.vue';
definePageMeta({ layout: 'admin', title: '相册', key: (route) => route.path });
</script>
<template><AlbumsView /></template>
