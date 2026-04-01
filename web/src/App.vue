<template>
  <div class="app-background" :style="backgroundStyle"></div>
  <router-view />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useSiteStore } from '@/stores/site';
import { useThemeStore } from '@/stores/theme';

const siteStore = useSiteStore();
const themeStore = useThemeStore();

watch(
  () => siteStore.data,
  (data) => {
    themeStore.initialize(data);
  },
  { immediate: true, deep: true }
);

const backgroundStyle = computed(() => themeStore.backgroundStyle(siteStore.data));
</script>
