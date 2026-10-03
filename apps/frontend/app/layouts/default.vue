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
const { t, localePath, contentLang } = useCoolI18n();
import { socialIcon } from '~/utils/social-icon';
const route = useRoute();
const store = useSiteStore();
const menuOpen = ref(false);
const menuTrigger = ref<HTMLButtonElement>();
const sidebar = ref<HTMLElement>();
const mobileQuery = ref('');
const mobileSearchFailure = ref('');
let previousOverflow = '';
const scrolled = ref(false);
const dark = ref(false);
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
  const scroll = () => {
    scrolled.value = window.scrollY > 40;
  };
  scroll();
  window.addEventListener('scroll', scroll, { passive: true });
  const resize = () => {
    if (window.innerWidth > 768) menuOpen.value = false;
  };
  window.addEventListener('resize', resize);
  onUnmounted(() => {
    window.removeEventListener('scroll', scroll);
    window.removeEventListener('resize', resize);
    if (menuOpen.value) document.body.style.overflow = previousOverflow;
  });
});
watch(menuOpen, async (open) => {
  if (open) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    sidebar.value
      ?.querySelector<HTMLElement>('button, a[href], input, select')
      ?.focus();
  } else {
    document.body.style.overflow = previousOverflow;
    await nextTick();
    menuTrigger.value?.focus();
  }
});
function sidebarKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    menuOpen.value = false;
    return;
  }
  if (event.key !== 'Tab') return;
  const items = sidebar.value?.querySelectorAll<HTMLElement>(
    'button, a[href], input, select',
  );
  if (!items?.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
function mobileSearch() {
  mobileSearchFailure.value = mobileQuery.value.trim()
    ? ''
    : '请输入搜索关键词。';
  if (!mobileSearchFailure.value) {
    menuOpen.value = false;
    void navigateTo({
      path: localePath('/search'),
      query: { q: mobileQuery.value.trim() },
    });
  }
}
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
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
        route.path === localePath('/') || route.path === `${localePath('/')}/`,
      'sidebar-open': menuOpen,
    }"
    :inert="menuOpen"
  >
    <header class="site-header" :class="{ yya: scrolled }">
      <div class="header-inner">
        <div class="header-before">
          <div class="site-branding">
            <h1 class="site-title">
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
                :to="localePath('/')"
                :lang="contentLang(store.site.contentLocale)"
                >{{ store.site.title }}</NuxtLink
              >
            </h1>
          </div>
        </div>
        <div class="header-content">
          <div class="lower-container">
            <div class="lower">
              <nav class="navbar">
                <ul class="menu-root">
                  <li v-for="item in menu" :key="item[0]" class="menu-item">
                    <NuxtLink :to="localePath(item[0]!)">{{
                      t(item[1]!)
                    }}</NuxtLink>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
        <div class="header-after">
          <NuxtLink
            :to="localePath('/search')"
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
  <!-- Keep the closed drawer hidden before the surface-scoped theme activates. -->
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
              <NuxtLink :to="localePath(item[0]!)" @click="menuOpen = false">
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
  <footer class="site-footer" :inert="menuOpen">
    <div class="site-info">
      <div class="footer-logo">
        <SakuraFlower class="footer-flower" />
      </div>
      <p class="footer-wish" lang="zh-CN">
        <em>愿你的天空永远星光灿烂，<br />愿你的舞台永远明光幻彩。</em>
      </p>
      <LanguageSelector variant="text" />
    </div>
  </footer>
</template>

<style scoped>
.mobile-brand {
  display: none;
}
@media (max-width: 768px) {
  .site-branding .site-title .desktop-brand {
    display: none;
  }
  .mobile-brand {
    display: block;
    max-width: 160px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    color: var(--sakura-heading);
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  .mobile-brand:focus-visible {
    outline: 1px solid currentColor;
    outline-offset: 3px;
  }
  .site-header .header-inner .header-before {
    justify-content: flex-start;
    padding-left: 20px;
  }
  .site-header .header-inner .header-after {
    padding-right: 20px;
  }
}

.footer-wish {
  margin: 12px 0;
}
.footer-wish em {
  font-style: italic;
}

/* English labels need a little more room beside the brand on tablet widths. */
@media (min-width: 769px) and (max-width: 1100px) {
  :global(html[lang='en']) .site-header .navbar .menu-root > .menu-item {
    padding-inline: 6px;
  }
  :global(html[lang='en']) .site-header .navbar .menu-root > .menu-item > a {
    font-size: 13px;
  }
}
</style>
