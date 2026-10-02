<script setup lang="ts">
import { ref, watch } from 'vue';
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
import { session } from './api';
const route = useRoute();
const router = useRouter();
const open = ref(false);
const nav = [
  { path: '/', label: '概览', icon: House },
  { path: '/posts', label: '文章', icon: Document },
  { path: '/pages', label: '独立页面', icon: Notebook },
  { path: '/media', label: '媒体库', icon: Picture },
  { path: '/categories', label: '分类', icon: Folder },
  { path: '/tags', label: '标签', icon: PriceTag },
  { path: '/moments', label: '瞬间', icon: EditPen },
  { path: '/photos', label: '图库', icon: Camera },
  { path: '/links', label: '友链', icon: LinkIcon },
  { path: '/comments', label: '评论', icon: ChatDotRound },
];
watch(
  () => route.path,
  () => {
    open.value = false;
  },
);
watch(
  () => session.token,
  (token) => {
    if (!token && route.path !== '/login')
      void router.replace({ path: '/login', query: { next: route.fullPath } });
  },
);
function logout() {
  session.token = '';
  session.owner = null;
  void router.replace('/login');
}
</script>
<template>
  <RouterView v-if="route.path === '/login'" />
  <div v-else class="admin-shell">
    <aside class="sidebar" :class="{ open }">
      <RouterLink to="/" class="brand"
        ><span class="brand-mark">❀</span>
        <div>Sakura<small>你的内容，自在生长。</small></div></RouterLink
      ><span class="nav-caption">工作空间</span>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          :class="{
            active:
              item.path === '/'
                ? route.path === '/'
                : route.path.startsWith(item.path),
          }"
          ><el-icon><component :is="item.icon" /></el-icon
          >{{ item.label }}</RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <RouterLink to="/settings"
          ><el-icon><Setting /></el-icon>网站配置</RouterLink
        ><RouterLink to="/profile"
          ><el-icon><User /></el-icon>我的账户</RouterLink
        ><button @click="logout">
          <el-icon><SwitchButton /></el-icon>退出登录
        </button>
      </div>
    </aside>
    <button
      v-if="open"
      class="sidebar-mask"
      aria-label="关闭导航"
      @click="open = false"
    ></button>
    <div class="admin-body">
      <header class="topbar">
        <div class="breadcrumbs">
          <el-button
            class="menu-toggle"
            :icon="Menu"
            text
            aria-label="打开导航"
            @click="open = !open"
          /><span>工作空间</span><span>/</span
          ><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="topbar-right">
          <a href="/" target="_blank" rel="noopener">访问博客 ↗</a
          ><span class="owner-avatar">{{
            session.owner?.displayName.slice(0, 1) || 'S'
          }}</span>
        </div>
      </header>
      <main class="workspace"><RouterView :key="route.path" /></main>
      <footer class="admin-footer">Sakura CMS · 写下值得记住的事</footer>
    </div>
  </div>
</template>
