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
const isHome = computed(() => route.path === '/');
const {
  menuOpen,
  menuTrigger,
  sidebar,
  dark,
  scrollProgress,
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
      'is-homepage': isHome,
      'sidebar-open': menuOpen,
    }"
    :inert="menuOpen"
  >
    <header
      class="site-header"
      :class="{
        'home-header': isHome,
        'header-readable': scrollProgress > 0.12,
      }"
      :style="{ '--header-progress': isHome ? scrollProgress : 1 }"
    >
      <div class="header-inner">
        <NuxtLink
          class="header-brand"
          :inert="isHome && scrollProgress < 0.1"
          :aria-hidden="isHome && scrollProgress < 0.1"
          :to="routePath('/')"
          :lang="contentLang(store.site.contentLocale)"
          :aria-label="store.site.title"
          ><SakuraWordmark
        /></NuxtLink>
        <nav class="header-content" :aria-label="t('主导航')">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="routePath(item[0]!)">{{ t(item[1]!) }}</NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="header-actions">
          <button
            ref="menuTrigger"
            class="mobile-menu reading-control"
            type="button"
            :aria-label="t('打开导航')"
            aria-controls="mobile-sidebar"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <ReadingControls />
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
  <FloatingThemeToggle
    :dark="dark"
    :inert="menuOpen"
    @toggle-theme="dark = !dark"
  />
  <SiteFooter :inert="menuOpen" />
</template>
