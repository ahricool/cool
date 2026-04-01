import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Home from '../pages/Home.vue';
import Post from '../pages/Post.vue';
import Page from '../pages/Page.vue';
import Tag from '../pages/Tag.vue';
import Category from '../pages/Category.vue';
import Archive from '../pages/Archive.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/post/:slug',
    name: 'Post',
    component: Post,
    props: true,
  },
  {
    path: '/page/:slug',
    name: 'Page',
    component: Page,
    props: true,
  },
  {
    path: '/tag/:tag',
    name: 'Tag',
    component: Tag,
    props: true,
  },
  {
    path: '/category/:category',
    name: 'Category',
    component: Category,
    props: true,
  },
  {
    path: '/archive',
    name: 'Archive',
    component: Archive,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

export default router;
