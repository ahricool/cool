<script setup lang="ts">
const { t, routePath, contentLang } = useCoolI18n();
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
      <div v-if="store.homepage.focusMode === 'avatar'" class="hero-avatar">
        <NuxtLink :to="routePath('/')"
          ><img
            :src="store.site.avatarUrl || '/sakura/images/default/avatar.webp'"
            :alt="store.site.authorName"
            width="120"
            height="120"
        /></NuxtLink>
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
