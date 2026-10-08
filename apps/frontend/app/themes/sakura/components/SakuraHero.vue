<script setup lang="ts">
import ReadingBanner from '~/themes/sakura/components/ReadingBanner.vue';
import ReadingBrand from '~/themes/sakura/components/ReadingBrand.vue';
const { t, contentLang } = useCoolI18n();
const store = useSiteStore();
</script>
<template>
  <ReadingBanner
    variant="home"
    :cover="store.homepage.coverUrl"
    :image-alt="t('首页背景')"
    :wave="store.homepage.wave"
  >
    <div class="hero-content">
      <div class="hero-brand">
        <ReadingBrand placement="hero" />
      </div>
      <div class="hero-description">
        <p class="flex-child-center">
          <span
            class="desc"
            :lang="contentLang(store.homepage.contentLocale)"
            >{{ store.homepage.description }}</span
          >
        </p>
      </div>
    </div>
  </ReadingBanner>
</template>
