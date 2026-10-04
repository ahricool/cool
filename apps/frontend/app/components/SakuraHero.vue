<script setup lang="ts">
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
