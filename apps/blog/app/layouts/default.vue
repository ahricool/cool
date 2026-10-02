<script setup lang="ts">
import { socialIcon } from '~/utils/social-icon';
const route = useRoute();
const store = useSiteStore();
const menuOpen = ref(false);
const menuTrigger = ref<HTMLButtonElement>();
const sidebar = ref<HTMLElement>();
const sidebarClose = ref<HTMLButtonElement>();
const mobileQuery = ref('');
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
    'button, a[href], input',
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
  if (mobileQuery.value.trim()) {
    menuOpen.value = false;
    void navigateTo({
      path: '/search',
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
  <a class="skip-link" href="#content" :inert="menuOpen">跳到正文</a>
  <section
    id="main-container"
    class="container"
    :class="{ 'is-homepage': route.path === '/', 'sidebar-open': menuOpen }"
    :inert="menuOpen"
  >
    <header class="site-header" :class="{ yya: scrolled }">
      <div class="header-inner">
        <div class="header-before">
          <button
            ref="menuTrigger"
            class="site-nav-toggle"
            :class="{ open: menuOpen }"
            aria-label="打开导航"
            aria-controls="mobile-sidebar"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <span class="nav-toggle"><span class="icon"></span></span>
          </button>
          <div class="site-branding">
            <h1 class="site-title">
              <NuxtLink to="/">{{ store.site.title }}</NuxtLink>
            </h1>
          </div>
        </div>
        <div class="header-content">
          <div class="lower-container">
            <div class="lower">
              <nav class="navbar">
                <ul class="menu-root">
                  <li v-for="item in menu" :key="item[0]" class="menu-item">
                    <NuxtLink :to="item[0]!">{{ item[1] }}</NuxtLink>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
        <div class="header-after">
          <NuxtLink to="/search" class="header-action" aria-label="搜索"
            ><SakuraIcon name="magnifer-linear" /></NuxtLink
          ><button
            class="header-action"
            :aria-label="dark ? '切换浅色' : '切换深色'"
            @click="dark = !dark"
          >
            <SakuraIcon :name="dark ? 'sun-2-linear' : 'moon-linear'" />
          </button>
        </div>
      </div>
    </header>
    <main id="page" class="main site wrapper">
      <div v-if="store.failed" class="site-error" role="alert">
        网站配置加载失败 <button @click="store.load">重试</button>
      </div>
      <slot />
    </main>
  </section>
  <button
    v-if="menuOpen"
    class="sidebar-backdrop"
    tabindex="-1"
    aria-label="关闭导航"
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
    aria-label="移动端菜单"
    @keydown="sidebarKeydown"
  >
    <button
      ref="sidebarClose"
      class="sidebar-close"
      aria-label="关闭菜单"
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
        <p class="glitch-text">{{ store.homepage.greeting }}</p>
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
            ><img :src="socialIcon(link.url)" alt="" width="18" height="18"
          /></a>
        </div>
        <div class="search">
          <form
            class="search-form"
            role="search"
            @submit.prevent="mobileSearch"
          >
            <input
              v-model="mobileQuery"
              class="m-search-input"
              type="search"
              aria-label="搜索文章"
              placeholder="搜索文章…"
              maxlength="100"
              required
            />
          </form>
        </div>
        <nav class="navbar" aria-label="移动端导航">
          <ul class="menu-root">
            <li v-for="item in menu" :key="item[0]" class="menu-item">
              <NuxtLink :to="item[0]!" @click="menuOpen = false">{{
                item[1]
              }}</NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="footer">
          <p>© {{ new Date().getFullYear() }} {{ store.site.title }}</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="site-footer" :inert="menuOpen">
    <div class="site-info">
      <div class="footer-logo">
        <p
          style="background-image: url('/sakura/images/footer/sakura.svg')"
        ></p>
      </div>
      <div class="footer-copyright">
        <p>
          Powered by Personal CMS · Crafted with
          <span class="footer-heart">♥</span> by
          <a
            href="https://github.com/LIlGG/halo-theme-sakura"
            target="_blank"
            rel="noopener noreferrer"
            >LIlGG</a
          >
        </p>
      </div>
      <p class="asset-credits">
        <a href="/sakura/ATTRIBUTION.md">资源许可</a> · Icons by
        <a
          href="https://www.figma.com/community/file/1166831539721848736"
          target="_blank"
          rel="noopener noreferrer"
          >480 Design</a
        >
        (CC BY 4.0)
      </p>
      <div class="footer-device">
        <p>© {{ new Date().getFullYear() }} {{ store.site.title }}</p>
      </div>
    </div>
  </footer>
  <button
    class="cd-top"
    :class="{ 'cd-is-visible': scrolled }"
    :tabindex="scrolled ? 0 : -1"
    aria-label="回到顶部"
    :inert="menuOpen"
    @click="toTop"
  ></button>
  <button
    class="m-cd-top"
    :class="{ 'cd-is-visible': scrolled }"
    :tabindex="scrolled ? 0 : -1"
    aria-label="回到顶部"
    :inert="menuOpen"
    @click="toTop"
  >
    <SakuraIcon name="alt-arrow-up-linear" />
  </button>
</template>
