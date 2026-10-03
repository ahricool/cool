<script setup lang="ts">
const { t, localePath, contentLang } = useCoolI18n();
import { socialIcon } from '~/utils/social-icon';
const route = useRoute();
const store = useSiteStore();
const menuOpen = ref(false);
const menuTrigger = ref<HTMLButtonElement>();
const sidebar = ref<HTMLElement>();
const sidebarClose = ref<HTMLButtonElement>();
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
  ['/links', '友链'],
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
    sidebarClose.value?.focus();
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
function toTop() {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });
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
          <button
            ref="menuTrigger"
            class="site-nav-toggle"
            :class="{ open: menuOpen }"
            :aria-label="t('打开导航')"
            aria-controls="mobile-sidebar"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <span class="nav-toggle"><span class="icon"></span></span>
          </button>
          <div class="site-branding">
            <h1 class="site-title">
              <NuxtLink
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
  <section
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
    <button
      ref="sidebarClose"
      class="sidebar-close"
      :aria-label="t('关闭菜单')"
      @click="menuOpen = false"
    ></button>
    <div class="sidebar-inner">
      <div class="mobile-sidebar">
        <div class="avatar">
          <img
            :src="store.site.avatarUrl || '/sakura/images/default/avatar.webp'"
            :alt="store.site.authorName"
            width="90"
            height="90"
          />
        </div>
        <p
          class="glitch-text"
          :lang="contentLang(store.homepage.contentLocale)"
        >
          {{ store.homepage.greeting }}
        </p>
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
              <NuxtLink :to="localePath(item[0]!)" @click="menuOpen = false">{{
                t(item[1]!)
              }}</NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="footer">
          <p>
            © {{ new Date().getFullYear() }}
            <span :lang="contentLang(store.site.contentLocale)">{{
              store.site.title
            }}</span>
          </p>
        </div>
      </div>
    </div>
  </section>
  <footer class="site-footer" :inert="menuOpen">
    <div class="site-info">
      <div class="footer-logo">
        <SakuraFlower class="footer-flower" />
      </div>
      <div class="footer-copyright">
        <p>
          {{ t('由 梦桜 驱动') }} · <span class="footer-heart">♥</span>
          {{ t('主题设计') }}
          <a
            href="https://github.com/LIlGG/halo-theme-sakura"
            target="_blank"
            rel="noopener noreferrer"
            >LIlGG</a
          >
        </p>
      </div>
      <p class="asset-credits">
        <a href="/sakura/ATTRIBUTION.md">{{ t('资源许可') }}</a> ·
        {{ t('图标设计') }}
        <a
          href="https://www.figma.com/community/file/1166831539721848736"
          target="_blank"
          rel="noopener noreferrer"
          >480 Design</a
        >
        (CC BY 4.0)
      </p>
      <LanguageSelector variant="text" />
      <div class="footer-device">
        <p>
          © {{ new Date().getFullYear() }}
          <span :lang="contentLang(store.site.contentLocale)">{{
            store.site.title
          }}</span>
        </p>
      </div>
    </div>
  </footer>
  <button
    class="cd-top"
    :class="{ 'cd-is-visible': scrolled }"
    :tabindex="scrolled ? 0 : -1"
    :aria-label="t('回到顶部')"
    :inert="menuOpen"
    @click="toTop"
  ></button>
  <button
    class="m-cd-top"
    :class="{ 'cd-is-visible': scrolled }"
    :tabindex="scrolled ? 0 : -1"
    :aria-label="t('回到顶部')"
    :inert="menuOpen"
    @click="toTop"
  >
    <SakuraIcon name="alt-arrow-up-linear" />
  </button>
</template>

<style scoped>
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
