<script setup lang="ts">
import { readingShellKey } from '~/utils/reading-shell';
defineProps<{ placement: 'header' | 'hero' }>();
const store = useSiteStore();
const { t, routePath, contentLang } = useCoolI18n();
const navigation = inject(readingShellKey);
if (!navigation) throw new Error('ReadingBrand requires the reading shell');
const { menuOpen, openMenu } = navigation;
</script>
<template>
  <span class="reading-brand" :lang="contentLang(store.site.contentLocale)">
    <NuxtLink
      v-if="placement === 'header'"
      class="brand-desktop"
      :to="routePath('/')"
      :aria-label="store.site.title"
      ><SakuraFlower spinning class="brand-flower" /><SakuraWordmark
    /></NuxtLink>
    <span v-else class="brand-desktop" role="img" :aria-label="store.site.title"
      ><SakuraFlower spinning class="brand-flower" /><SakuraWordmark
    /></span>
    <button
      class="brand-mobile"
      type="button"
      :aria-label="t('打开导航')"
      :title="store.site.title"
      aria-controls="mobile-sidebar"
      :aria-expanded="menuOpen"
      @click="openMenu"
    >
      <SakuraFlower spinning class="brand-flower" /><SakuraWordmark />
    </button>
  </span>
</template>
<style scoped>
.reading-brand,
.brand-desktop {
  display: inline-flex;
  align-items: center;
}
.brand-flower {
  width: calc(var(--wordmark-width, 60px) * 0.45);
  height: calc(var(--wordmark-width, 60px) * 0.45);
  margin-right: 10px;
}
.brand-mobile {
  display: none;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.brand-mobile:hover {
  opacity: 0.85;
}
.brand-mobile:focus-visible {
  outline: 2px solid var(--reading-interaction, var(--sakura-accent-strong));
  outline-offset: 4px;
}
@media (max-width: 768px) {
  .brand-desktop {
    display: none;
  }
  .brand-mobile {
    display: inline-flex;
  }
}
</style>
