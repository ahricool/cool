<script setup lang="ts">
import '~/assets/admin/index.css';
import ThemeToggle from '~/features/admin/visuals/ThemeToggle.vue';
import { useCoolI18n } from '~/composables/useCoolI18n';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, clearSession, errorText, session } from '~/features/admin/api';
import { toast } from '~/utils/toast';
import AdminNavigationMenu from '~/features/admin/components/AdminNavigationMenu.vue';
import AdminAccountMenu from '~/features/admin/components/AdminAccountMenu.vue';
import { publicUrl } from '~/features/admin/publicUrl';
const { t } = useCoolI18n();
const route = useRoute();
const dark = useCoolTheme('admin');
const router = useRouter();
const blogUrl = computed(() => publicUrl());
provide('admin-active-menu', ref<string | null>(null));
const nav = [
  { path: '/admin', label: '概览', icon: 'home' },
  { path: '/admin/posts', label: '内容', icon: 'document' },
  { path: '/admin/about', label: '关于我', icon: 'document' },
  { path: '/admin/pages', label: '独立页面', icon: 'pages' },
  { path: '/admin/tags', label: '标签', icon: 'tag' },
  { path: '/admin/photos', label: '相册', icon: 'photos' },
] as const;
watch(
  () => session.owner,
  (owner) => {
    if (!owner && route.path !== '/admin/login')
      void router.replace({
        path: '/admin/login',
        query: { next: route.fullPath },
      });
  },
);
const loggingOut = ref(false);
async function logout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await api('/admin/auth/logout', { method: 'POST' });
    clearSession();
    await router.replace('/admin/login');
  } catch (error) {
    toast.error(t(errorText(error)));
  } finally {
    loggingOut.value = false;
  }
}
useHead(() => ({
  title: `${t(String(route.meta.title ?? '管理'))} · 梦桜`,
}));
</script>
<template>
  <slot v-if="route.path === '/admin/login'" />
  <div v-else class="admin-shell">
    <div class="admin-body">
      <header class="topbar navigation-surface navigation-surface--top">
        <AdminNavigationMenu :items="nav" />
        <div class="topbar-right">
          <AdminAccountMenu
            :owner="session.owner"
            :logging-out="loggingOut"
            @logout="logout"
          />
          <a :href="blogUrl" target="_blank" rel="noopener">{{
            t('访问博客 ↗')
          }}</a>
        </div>
      </header>
      <main class="workspace"><slot /></main>
      <ThemeToggle floating :dark="dark" @toggle-theme="dark = !dark" />
    </div>
  </div>
</template>
