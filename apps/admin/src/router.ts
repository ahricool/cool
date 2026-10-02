import { createRouter, createWebHistory } from 'vue-router';
import { session } from './api';
export const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    {
      path: '/login',
      component: () => import('./views/LoginView.vue'),
      meta: { title: '站长登录' },
    },
    {
      path: '/',
      component: () => import('./views/DashboardView.vue'),
      meta: { title: '概览' },
    },
    {
      path: '/posts',
      component: () => import('./views/PostsView.vue'),
      meta: { title: '文章' },
    },
    {
      path: '/posts/:id',
      component: () => import('./views/EditorView.vue'),
      props: { kind: 'posts' },
      meta: { title: '文章编辑' },
    },
    {
      path: '/pages',
      component: () => import('./views/PostsView.vue'),
      props: { kind: 'pages' },
      meta: { title: '独立页面' },
    },
    {
      path: '/pages/:id',
      component: () => import('./views/EditorView.vue'),
      props: { kind: 'pages' },
      meta: { title: '页面编辑' },
    },
    {
      path: '/media',
      component: () => import('./views/MediaView.vue'),
      meta: { title: '媒体库' },
    },
    {
      path: '/categories',
      component: () => import('./views/TaxonomyView.vue'),
      props: { kind: 'categories' },
      meta: { title: '分类' },
    },
    {
      path: '/tags',
      component: () => import('./views/TaxonomyView.vue'),
      props: { kind: 'tags' },
      meta: { title: '标签' },
    },
    {
      path: '/moments',
      component: () => import('./views/CollectionsView.vue'),
      props: { kind: 'moments' },
      meta: { title: '瞬间' },
    },
    {
      path: '/photos',
      component: () => import('./views/CollectionsView.vue'),
      props: { kind: 'photos' },
      meta: { title: '图库' },
    },
    {
      path: '/links',
      component: () => import('./views/CollectionsView.vue'),
      props: { kind: 'links' },
      meta: { title: '友链' },
    },
    {
      path: '/comments',
      component: () => import('./views/CommentsView.vue'),
      meta: { title: '评论审核' },
    },
    {
      path: '/settings',
      component: () => import('./views/SettingsView.vue'),
      meta: { title: '网站配置' },
    },
    {
      path: '/profile',
      component: () => import('./views/ProfileView.vue'),
      meta: { title: '我的账户' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
router.beforeEach((to) =>
  !session.token && to.path !== '/login'
    ? { path: '/login', query: { next: to.fullPath } }
    : true,
);
router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? '管理')} · Sakura CMS`;
});
