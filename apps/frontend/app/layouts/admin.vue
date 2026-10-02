<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  House,
  Document,
  EditPen,
  Picture,
  Folder,
  PriceTag,
  ChatDotRound,
  Setting,
  User,
  Link as LinkIcon,
  Camera,
  Notebook,
  SwitchButton,
  Menu,
} from '@element-plus/icons-vue';
import { api, clearSession, errorText, session } from '~/features/admin/api';
import { ElMessage } from 'element-plus';
import { publicUrl } from '~/features/admin/publicUrl';
const route = useRoute();
const router = useRouter();
const open = ref(false);
const mobile = ref(false);
const sidebar = ref<HTMLElement>();
const menuTrigger = ref<HTMLButtonElement>();
const menuClose = ref<HTMLButtonElement>();
let previousOverflow = '';
function resize() {
  mobile.value = window.innerWidth <= 760;
  if (!mobile.value) open.value = false;
}
onMounted(() => {
  resize();
  window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  if (open.value) document.body.style.overflow = previousOverflow;
});
watch(open, async (value) => {
  if (value) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    menuClose.value?.focus();
  } else {
    document.body.style.overflow = previousOverflow;
    await nextTick();
    if (
      document.activeElement === document.body ||
      sidebar.value?.contains(document.activeElement)
    )
      menuTrigger.value?.focus();
  }
});
function menuKeydown(event: KeyboardEvent) {
  if (!mobile.value || !open.value) return;
  if (event.key === 'Escape') {
    open.value = false;
    return;
  }
  if (event.key !== 'Tab') return;
  const items = sidebar.value?.querySelectorAll<HTMLElement>('a[href], button');
  const first = items?.[0];
  const last = items?.[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
const blogUrl = publicUrl();
const nav = [
  { path: '/admin', label: '概览', icon: House },
  { path: '/admin/posts', label: '文章', icon: Document },
  { path: '/admin/pages', label: '独立页面', icon: Notebook },
  { path: '/admin/media', label: '媒体库', icon: Picture },
  { path: '/admin/categories', label: '分类', icon: Folder },
  { path: '/admin/tags', label: '标签', icon: PriceTag },
  { path: '/admin/moments', label: '瞬间', icon: EditPen },
  { path: '/admin/photos', label: '图库', icon: Camera },
  { path: '/admin/links', label: '友链', icon: LinkIcon },
  { path: '/admin/comments', label: '评论', icon: ChatDotRound },
];
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
    ElMessage.error(errorText(error));
  } finally {
    loggingOut.value = false;
  }
}
useHead(() => ({
  title: `${String(route.meta.title ?? '管理')} · Sakura CMS`,
}));
</script>
<template>
  <slot v-if="route.path === '/admin/login'" />
  <div v-else class="admin-shell">
    <aside
      id="admin-navigation"
      ref="sidebar"
      class="sidebar"
      :class="{ open }"
      :inert="mobile && !open"
      :role="mobile ? 'dialog' : undefined"
      :aria-modal="mobile && open ? true : undefined"
      aria-label="工作空间导航"
      @keydown="menuKeydown"
    >
      <button
        ref="menuClose"
        class="sidebar-dismiss"
        aria-label="关闭菜单"
        @click="open = false"
      >
        ×
      </button>
      <RouterLink to="/admin" class="brand" @click="open = false"
        ><SakuraFlower class="brand-mark" />
        <div>Sakura<small>你的内容，自在生长。</small></div></RouterLink
      ><span class="nav-caption">工作空间</span>
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
          ><el-icon><component :is="item.icon" /></el-icon
          >{{ item.label }}</RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <RouterLink to="/admin/settings" @click="open = false"
          ><el-icon><Setting /></el-icon>网站配置</RouterLink
        ><RouterLink to="/admin/profile" @click="open = false"
          ><el-icon><User /></el-icon>我的账户</RouterLink
        ><button :disabled="loggingOut" @click="logout">
          <el-icon><SwitchButton /></el-icon>退出登录
        </button>
      </div>
    </aside>
    <button
      v-if="open"
      class="sidebar-mask"
      tabindex="-1"
      aria-label="关闭导航"
      @click="open = false"
    ></button>
    <div class="admin-body" :inert="mobile && open">
      <header class="topbar">
        <div class="breadcrumbs">
          <button
            ref="menuTrigger"
            class="menu-toggle"
            aria-label="打开导航"
            aria-controls="admin-navigation"
            :aria-expanded="open"
            @click="open = !open"
          >
            <el-icon><Menu /></el-icon></button
          ><span>工作空间</span><span>/</span
          ><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="topbar-right">
          <a :href="blogUrl" target="_blank" rel="noopener">访问博客 ↗</a
          ><span class="owner-avatar">{{
            session.owner?.displayName.slice(0, 1) || 'S'
          }}</span>
        </div>
      </header>
      <main class="workspace"><slot /></main>
      <footer class="admin-footer">Sakura CMS · 写下值得记住的事</footer>
    </div>
  </div>
</template>
