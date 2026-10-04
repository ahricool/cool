<script setup lang="ts">
const navigationIcons = {
  '/': 'home',
  '/archives': 'archive',
  '/categories': 'categories',
  '/tags': 'tag',
  '/moments': 'moments',
  '/photos': 'photos',
} as const;
const { t, routePath, contentLang } = useCoolI18n();
import { readingShellKey } from '~/utils/reading-shell';
const route = useRoute();
const store = useSiteStore();
const isHome = computed(() => route.path === '/');
const {
  menuOpen,
  openMenu,
  sidebar,
  dark,
  scrollProgress,
  hasBanner,
  hasIllustration,
  registerBanner,
  sidebarKeydown,
} = useReadingShell();
provide(readingShellKey, { menuOpen, openMenu, registerBanner });
const menu = [
  ['/', '首页'],
  ['/archives', '归档'],
  ['/categories', '分类'],
  ['/tags', '标签'],
  ['/moments', '瞬间'],
  ['/photos', '图库'],
];
useHead(() => ({
  title: store.site.title,
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
      class="site-header navigation-surface navigation-surface--top"
      :class="{
        'home-header': isHome,
        'over-banner': hasBanner && hasIllustration,
        'header-readable': !hasIllustration || scrollProgress >= 1,
        'header-solid': scrollProgress >= 1 / 3,
      }"
      :style="{ '--header-progress': scrollProgress }"
    >
      <div class="header-inner">
        <ReadingBrand
          placement="header"
          class="header-brand"
          :inert="isHome && scrollProgress < 0.1"
          :aria-hidden="isHome && scrollProgress < 0.1"
        />
        <nav class="header-content" :aria-label="t('主导航')">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="routePath(item[0]!)">{{ t(item[1]!) }}</NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="header-actions">
          <ReadingControls />
        </div>
      </div>
    </header>
    <main id="page" class="main site wrapper">
      <div v-if="store.failed" class="site-error" role="alert">
        {{ t('网站配置加载失败') }}
        <button @click="store.load(true)">{{ t('重试') }}</button>
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
    class="site-sidebar navigation-surface navigation-surface--side"
    :class="{
      open: menuOpen,
      'over-illustration': hasIllustration && scrollProgress < 1,
    }"
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
              role="img"
              :aria-label="store.site.title"
              ><SakuraWordmark
            /></span>
          </div>
        </div>
        <nav class="navbar" :aria-label="t('移动端导航')">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="routePath(item[0]!)" @click="menuOpen = false">
                <ReadingIcon
                  :name="
                    navigationIcons[item[0] as keyof typeof navigationIcons]
                  "
                  class="sidebar-nav-icon navigation-icon--shadow"
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
  <ThemeToggle
    floating
    :dark="dark"
    :inert="menuOpen"
    @toggle-theme="dark = !dark"
  />
  <SiteFooter :inert="menuOpen" />
</template>
