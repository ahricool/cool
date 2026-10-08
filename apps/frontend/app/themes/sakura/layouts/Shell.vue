<script setup lang="ts">
import { useReadingShell } from '~/themes/sakura/composables/useReadingShell';
import SiteFooter from '~/themes/sakura/components/SiteFooter.vue';
import ReadingBrand from '~/themes/sakura/components/ReadingBrand.vue';
import ThemeToggle from '~/themes/sakura/components/ThemeToggle.vue';
import ReadingControls from '~/themes/sakura/components/ReadingControls.vue';
import { readingShellKey } from '~/themes/sakura/utils/reading-shell';
const { t } = useCoolI18n();
const store = useSiteStore();
const {
  dark,
  canToggle,
  scrollProgress,
  hasBanner,
  hasIllustration,
  registerBanner,
} = useReadingShell();
provide(readingShellKey, { registerBanner });
useHead(() => ({ title: store.site.title }));
</script>
<template>
  <a class="skip-link" href="#content">{{ t('跳到正文') }}</a>
  <section id="main-container" class="container">
    <header
      class="site-header navigation-surface navigation-surface--top"
      :class="{
        'over-banner': hasBanner && hasIllustration,
        'header-readable': !hasIllustration || scrollProgress >= 1,
        'header-solid': scrollProgress >= 1 / 3,
      }"
      :style="{ '--header-progress': scrollProgress }"
    >
      <div class="header-inner">
        <ReadingBrand placement="header" class="header-brand" />
        <nav class="header-actions" :aria-label="t('主导航')">
          <NuxtLink to="/about" class="about-link">{{ t('我') }}</NuxtLink>
          <ReadingControls />
        </nav>
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
  <ThemeToggle
    v-if="canToggle"
    floating
    :dark="dark"
    @toggle-theme="dark = !dark"
  />
  <SiteFooter />
</template>
