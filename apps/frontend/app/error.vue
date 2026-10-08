<script setup lang="ts">
import type { NuxtError } from '#app';
import { resolveSiteTheme } from '~/themes/registry';
import { themeComponent } from '~/themes/components';
defineProps<{ error: NuxtError }>();
const { appearance, isAdmin, ready } = useSiteAppearanceHead();
const theme = computed(() => resolveSiteTheme(appearance.value.themeId));
const adminError = themeComponent(() => import('~/features/admin/Error.vue'));
const component = computed(() =>
  isAdmin.value ? adminError : themeComponent(theme.value.error),
);
</script>
<template>
  <component
    v-if="ready"
    :is="component"
    :key="isAdmin ? 'admin' : theme.id"
    :error="error"
  />
</template>
