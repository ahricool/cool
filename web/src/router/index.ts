import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/Home.vue') },
    { path: '/post/:slug', name: 'post', component: () => import('@/pages/Post.vue'), props: true },
    { path: '/page/:slug', name: 'page', component: () => import('@/pages/Page.vue'), props: true },
    { path: '/archive', name: 'archive', component: () => import('@/pages/Archive.vue') },
    { path: '/category/:slug', name: 'category', component: () => import('@/pages/Category.vue'), props: true },
    { path: '/tag/:slug', name: 'tag', component: () => import('@/pages/Tag.vue'), props: true },
    { path: '/search', name: 'search', component: () => import('@/pages/Search.vue') },
    { path: '/links', name: 'links', component: () => import('@/pages/Links.vue') },
    { path: '/author', name: 'author', component: () => import('@/pages/Author.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

export default router;
