<template>
  <div class="pjax">
    <section id="main-container" class="container">
      <header class="site-header" :class="{ yya: scrolled, sabit: scrolled }" itemscope itemtype="http://schema.org/WPHeader">
        <div class="header-inner">
          <HeaderBar />
        </div>
      </header>

      <main id="page" class="main site wrapper">
        <div class="column">
          <header class="header" itemscope itemtype="http://schema.org/WPHeader">
            <slot name="header" />
          </header>
        </div>

        <div id="content" class="main-inner site-content">
          <slot />
          <slot name="sidebar" />
        </div>
      </main>
    </section>

    <section class="site-sidebar" :class="{ open: themeStore.mobileSidebarOpen }">
      <div class="sidebar-close" @click="themeStore.closeMobileSidebar"></div>
      <div class="sidebar-inner mobile-sidebar-panel">
        <nav class="mobile-sidebar-nav">
          <RouterLink v-for="item in siteStore.data.navigation" :key="item.path" :to="item.path" @click="themeStore.closeMobileSidebar">
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="mobile-sidebar-socials">
          <a v-for="item in siteStore.data.socialLinks" :key="item.url" :href="item.url" target="_blank" rel="noreferrer">
            {{ item.label }}
          </a>
        </div>
      </div>
    </section>

    <footer class="site-footer" role="contentinfo">
      <div class="site-info">
        <SiteFooter />
      </div>
    </footer>

    <ThemeSwitcher />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useSiteStore } from '@/stores/site';
import { useThemeStore } from '@/stores/theme';
import HeaderBar from '@/components/HeaderBar.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';

const siteStore = useSiteStore();
const themeStore = useThemeStore();
const scrolled = ref(false);

function onScroll() {
  scrolled.value = window.scrollY > 16;
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>
