<script setup lang="ts">
import { resolveSiteTheme } from '~/themes/registry';
import { themeComponent } from '~/themes/components';
const store = useSiteStore();
const theme = computed(() => resolveSiteTheme(store.site.appearance.themeId));
const entry = computed(() => themeComponent(theme.value.entry));
</script>
<template>
  <component v-if="store.initialized" :is="entry" :key="theme.id"
    ><slot
  /></component>
</template>
