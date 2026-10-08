<script setup lang="ts">
import type { NuxtError } from '#app';
import { resolveSiteTheme } from '~/themes/registry';
import { themeComponent } from '~/themes/components';
import { leaveAdminUi } from '~/features/admin/install';
const props = defineProps<{ error: NuxtError }>();
const { t } = useCoolI18n();
const installationFailed = computed(
  () =>
    !!props.error.data &&
    typeof props.error.data === 'object' &&
    'adminUi' in props.error.data &&
    props.error.data.adminUi === true,
);
function reload() {
  window.location.reload();
}
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
  <!-- This recovery UI must not depend on the Admin chunk that failed to load. -->
  <main v-if="installationFailed" class="admin-resource-error" role="alert">
    <h1>{{ t('工作空间资源加载失败，请重新加载页面后重试。') }}</h1>
    <button @click="reload">{{ t('重新加载') }}</button>
    <a href="/">{{ t('← 返回博客') }}</a>
  </main>
  <component
    v-else-if="ready"
    :is="component"
    :key="isAdmin ? 'admin' : theme.id"
    :error="error"
  />
</template>
<style scoped>
.admin-resource-error {
  display: grid;
  min-height: 100svh;
  align-content: center;
  justify-items: center;
  gap: 16px;
  padding: 24px;
  box-sizing: border-box;
  font-family: system-ui, sans-serif;
}
</style>
