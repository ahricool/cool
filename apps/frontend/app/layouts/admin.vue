<script setup lang="ts">
import { useCoolI18n } from '~/composables/useCoolI18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, clearSession, errorText, session } from '~/features/admin/api';
import { ElMessage } from 'element-plus';
import { publicUrl } from '~/features/admin/publicUrl';
const { t } = useCoolI18n();
const route = useRoute();
const dark = useCoolTheme();
const router = useRouter();
const open = ref(false);
const mobile = ref(false);
const sidebar = ref<HTMLElement>();
const menuTrigger = ref<HTMLButtonElement>();
const menuKeydown = useDrawerFocus(open, sidebar, menuTrigger);
function resize() {
  mobile.value = window.innerWidth <= 960;
  if (!mobile.value) open.value = false;
}
onMounted(() => {
  resize();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
});
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
  () => route.path,
  () => {
    open.value = false;
  },
);
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
    ElMessage.error(t(errorText(error)));
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
      ref="sidebar"
      class="sidebar navigation-surface navigation-surface--side"
      :class="{ open }"
      :inert="mobile && !open"
      :role="mobile ? 'dialog' : undefined"
      :aria-modal="mobile && open ? true : undefined"
      :aria-label="t('工作空间导航')"
      @keydown="menuKeydown"
    >
      <RouterLink
        to="/admin"
        class="brand"
        aria-label="梦桜"
        @click="open = false"
      >
        <SakuraFlower class="brand-mark" />
        <SakuraWordmark />
      </RouterLink>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          @click="open = false"
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
      <div class="sidebar-bottom">
        <RouterLink to="/admin/settings" @click="open = false"
          ><ReadingIcon name="settings" class="navigation-icon--shadow" />{{
            t('网站配置')
          }}</RouterLink
        ><RouterLink to="/admin/profile" @click="open = false"
          ><ReadingIcon name="user" class="navigation-icon--shadow" />{{
            t('我的账户')
          }}</RouterLink
        ><button :disabled="loggingOut" @click="logout">
          <ReadingIcon name="logout" class="navigation-icon--shadow" />{{
            t('退出登录')
          }}
        </button>
      </div>
    </aside>
    <button
      v-if="open"
      class="sidebar-mask"
      tabindex="-1"
      :aria-label="t('关闭导航')"
      @click="open = false"
    ></button>
    <div class="admin-body" :inert="mobile && open">
      <header class="topbar navigation-surface navigation-surface--top">
        <button
          ref="menuTrigger"
          class="menu-toggle"
          :aria-label="t('打开导航')"
          aria-controls="admin-navigation"
          :aria-expanded="open"
          @click="open = !open"
        >
          <SakuraWordmark />
        </button>
        <div class="topbar-right">
          <a :href="blogUrl" target="_blank" rel="noopener">{{
            t('访问博客 ↗')
          }}</a
          ><ThemeToggle :dark="dark" @toggle-theme="dark = !dark" /><span
            class="owner-avatar"
            >{{ session.owner?.displayName.slice(0, 1) || 'C' }}</span
          >
        </div>
      </header>
      <main class="workspace"><slot /></main>
    </div>
  </div>
</template>
