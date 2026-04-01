<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSiteStore } from './stores/site';
import { useThemeStore } from './stores/theme';

const siteStore = useSiteStore();
const themeStore = useThemeStore();
const route = useRoute();

onMounted(() => {
  themeStore.loadSettings();
  siteStore.fetchConfig();
});
</script>

<template>
  <div id="app" :class="{ 'dark-mode': themeStore.settings.darkMode }">
    <router-view :key="route.fullPath" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f9f9f9;
}

#app {
  min-height: 100vh;
}

.dark-mode {
  background: #1a1a1a;
  color: #fff;
}

.dark-mode .site-header {
  background: #2a2a2a !important;
}

.dark-mode .widget,
.dark-mode .post-item,
.dark-mode .page-content,
.dark-mode .post-content {
  background: #2a2a2a !important;
  color: #fff !important;
}
</style>
