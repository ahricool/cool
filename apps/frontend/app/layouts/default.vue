<script setup lang="ts">
import {
  House,
  Notebook,
  Folder,
  PriceTag,
  EditPen,
  Camera,
} from '@element-plus/icons-vue';
const navigationIcons = {
  '/': House,
  '/archives': Notebook,
  '/categories': Folder,
  '/tags': PriceTag,
  '/moments': EditPen,
  '/photos': Camera,
};
const { t, routePath, contentLang } = useCoolI18n();
import { socialIcon } from '~/utils/social-icon';
const route = useRoute();
const store = useSiteStore();
const {
  menuOpen,
  menuTrigger,
  sidebar,
  dark,
  mobileQuery,
  mobileSearchFailure,
  sidebarKeydown,
} = useReadingShell();
const menu = [
  ['/', '首页'],
  ['/archives', '归档'],
  ['/categories', '分类'],
  ['/tags', '标签'],
  ['/moments', '瞬间'],
  ['/photos', '图库'],
];
onMounted(() => {
  void store.load();
});
function mobileSearch() {
  mobileSearchFailure.value = mobileQuery.value.trim()
    ? ''
    : '请输入搜索关键词。';
  if (!mobileSearchFailure.value) {
    menuOpen.value = false;
    void navigateTo({
      path: routePath('/search'),
      query: { q: mobileQuery.value.trim() },
    });
  }
}
useHead(() => ({
  title: store.site.title,
  htmlAttrs: { class: dark.value ? 'dark' : '' },
}));
</script>
<template>
  <a class="skip-link" href="#content" :inert="menuOpen">{{ t('跳到正文') }}</a>
  <section
    id="main-container"
    class="container"
    :class="{
      'is-homepage':
        route.path === routePath('/') || route.path === `${routePath('/')}/`,
      'sidebar-open': menuOpen,
    }"
    :inert="menuOpen"
  >
    <header class="site-header">
      <div class="header-inner">
        <div class="header-before">
          <div class="site-branding">
            <div class="site-title">
              <button
                ref="menuTrigger"
                class="mobile-brand"
                type="button"
                :lang="contentLang(store.site.contentLocale)"
                :aria-label="t('打开导航')"
                aria-controls="mobile-sidebar"
                :aria-expanded="menuOpen"
                @click="menuOpen = !menuOpen"
              >
                {{ store.site.title }}
              </button>
              <NuxtLink
                class="desktop-brand"
                :to="routePath('/')"
                :lang="contentLang(store.site.contentLocale)"
                ><SakuraFlower class="brand-flower" />{{
                  store.site.title
                }}</NuxtLink
              >
            </div>
          </div>
        </div>
        <nav class="header-content" :aria-label="t('主导航')">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="routePath(item[0]!)">{{ t(item[1]!) }}</NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="header-after">
          <NuxtLink
            :to="routePath('/search')"
            class="header-action"
            :aria-label="t('搜索')"
            ><SakuraIcon name="magnifer-linear" /></NuxtLink
          ><button
            class="header-action"
            :aria-label="t(dark ? '切换浅色' : '切换深色')"
            @click="dark = !dark"
          >
            <SakuraIcon :name="dark ? 'sun-2-linear' : 'moon-linear'" />
          </button>
        </div>
      </div>
    </header>
    <main id="page" class="main site wrapper">
      <div v-if="store.failed" class="site-error" role="alert">
        {{ t('网站配置加载失败') }}
        <button @click="store.load">{{ t('重试') }}</button>
      </div>
      <slot />
    </main>
  </section>
  <button
    v-if="menuOpen"
    class="sidebar-backdrop"
    tabindex="-1"
    :aria-label="t('关闭导航')"
    @click="menuOpen = false"
  ></button>
  <section
    v-show="menuOpen"
    id="mobile-sidebar"
    ref="sidebar"
    class="site-sidebar"
    :class="{ open: menuOpen }"
    :inert="!menuOpen"
    :aria-hidden="!menuOpen"
    role="dialog"
    aria-modal="true"
    :aria-label="t('移动端菜单')"
    @keydown="sidebarKeydown"
  >
    <div class="sidebar-inner">
      <div class="mobile-sidebar">
        <div class="sidebar-brand">
          <SakuraFlower class="sidebar-brand-mark" />
          <div>
            <span
              class="sidebar-brand-title"
              :lang="contentLang(store.site.contentLocale)"
              >{{ store.site.title }}</span
            >
            <small>{{ t('你的内容，自在生长。') }}</small>
          </div>
        </div>
        <div v-if="store.social.length" class="socials">
          <a
            v-for="link in store.social"
            :key="link.url"
            class="social-item"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="link.label"
            :title="link.label"
            :lang="contentLang(link.contentLocale)"
            ><img :src="socialIcon(link.url)" alt="" width="18" height="18"
          /></a>
        </div>
        <div class="search">
          <form
            class="search-form"
            role="search"
            novalidate
            @submit.prevent="mobileSearch"
          >
            <input
              v-model="mobileQuery"
              :aria-invalid="!!mobileSearchFailure"
              :aria-describedby="
                mobileSearchFailure ? 'mobile-search-error' : undefined
              "
              class="m-search-input"
              type="search"
              :aria-label="t('搜索文章')"
              :placeholder="t('搜索文章…')"
              maxlength="100"
              required
            />
            <p v-if="mobileSearchFailure" id="mobile-search-error" role="alert">
              {{ t(mobileSearchFailure) }}
            </p>
          </form>
        </div>
        <nav class="navbar" :aria-label="t('移动端导航')">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="routePath(item[0]!)" @click="menuOpen = false">
                <component
                  :is="navigationIcons[item[0] as keyof typeof navigationIcons]"
                  class="sidebar-nav-icon"
                  aria-hidden="true"
                />
                <span>{{ t(item[1]!) }}</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </section>
  <SiteFooter :inert="menuOpen" />
</template>
