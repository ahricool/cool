<script setup lang="ts">
const route = useRoute();
const store = useSiteStore();
const menuOpen = ref(false);
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
  onUnmounted(() => window.removeEventListener('scroll', scroll));
});
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  <a class="skip-link" href="#content">跳到正文</a>
  <section
    id="main-container"
    class="container"
    :class="{ 'is-homepage': route.path === '/' }"
  >
    <header class="site-header" :class="{ yya: scrolled }">
      <div class="header-inner">
        <div class="header-before">
          <button
            class="mobile-toggle"
            aria-label="打开导航"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <SakuraIcon name="hamburger-menu-linear" />
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
    <nav v-if="menuOpen" class="mobile-menu" aria-label="移动端导航">
      <NuxtLink v-for="item in menu" :key="item[0]" :to="item[0]!">{{
        item[1]
      }}</NuxtLink
      ><NuxtLink to="/search">搜索</NuxtLink>
    </nav>
    <main id="page" class="main site wrapper">
      <div v-if="store.failed" class="site-error" role="alert">
        网站配置加载失败 <button @click="store.load">重试</button>
      </div>
      <slot />
    </main>
  </section>
  <footer class="site-footer">
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
  <button v-if="scrolled" class="back-top" aria-label="回到顶部" @click="toTop">
    <SakuraIcon name="alt-arrow-up-linear" />
  </button>
</template>
