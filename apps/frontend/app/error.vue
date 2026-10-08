<script setup lang="ts">
import type { NuxtError } from '#app';
import { resolveSiteTheme } from '~/themes/registry';
import { themeComponent } from '~/themes/components';
import { leaveAdminUi } from '~/features/admin/install';
defineProps<{ error: NuxtError }>();
// Fatal errors mount a separate Nuxt root without running route middleware.
leaveAdminUi();
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
