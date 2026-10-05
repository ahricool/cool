<script setup lang="ts">
import { useCoolI18n } from '~/composables/useCoolI18n';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, clearSession, errorText, session } from '~/features/admin/api';
import { toast } from '~/utils/toast';
import AdminAccountMenu from '~/features/admin/components/AdminAccountMenu.vue';
import { publicUrl } from '~/features/admin/publicUrl';
const { t } = useCoolI18n();
const route = useRoute();
const dark = useCoolTheme();
const router = useRouter();
const blogUrl = computed(() => publicUrl());
const nav = [
  { path: '/admin', label: '概览', icon: 'home' },
  { path: '/admin/posts', label: '文章', icon: 'document' },
  { path: '/admin/pages', label: '独立页面', icon: 'pages' },
  { path: '/admin/media', label: '媒体库', icon: 'photos' },
  { path: '/admin/categories', label: '分类', icon: 'categories' },
  { path: '/admin/tags', label: '标签', icon: 'tag' },
  { path: '/admin/moments', label: '瞬间', icon: 'moments' },
  { path: '/admin/photos', label: '图库', icon: 'photos' },
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
    <aside
      id="admin-navigation"
      class="sidebar"
      :aria-label="t('工作空间导航')"
    >
      <RouterLink to="/admin" class="brand" aria-label="梦桜">
        <SakuraFlower class="brand-mark" />
        <SakuraWordmark />
      </RouterLink>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          :class="{
            active:
              item.path === '/admin'
                ? route.path === '/admin'
                : route.path.startsWith(item.path),
          }"
          ><ReadingIcon :name="item.icon" class="navigation-icon--shadow" />{{
            t(item.label)
          }}</RouterLink
        >
      </nav>
    </aside>
    <div class="admin-body">
      <header class="topbar navigation-surface navigation-surface--top">
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
