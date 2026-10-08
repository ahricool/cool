<script setup lang="ts">
import type { PublicPage } from '~/themes/types';
import { resolveSiteTheme } from '~/themes/registry';
import { themeComponent } from '~/themes/components';
const props = defineProps<{ page: PublicPage }>();
const store = useSiteStore();
const theme = computed(() => resolveSiteTheme(store.site.appearance.themeId));
const component = computed(() => themeComponent(theme.value.pages[props.page]));
</script>
<template><component :is="component" :key="`${theme.id}:${page}`" /></template>
