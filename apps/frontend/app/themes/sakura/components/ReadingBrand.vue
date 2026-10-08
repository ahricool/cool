<script setup lang="ts">
import SakuraWordmark from '~/themes/sakura/components/SakuraWordmark.vue';
import SakuraFlower from '~/themes/sakura/components/SakuraFlower.vue';
defineProps<{ placement: 'header' | 'hero' }>();
const store = useSiteStore();
const { contentLang } = useCoolI18n();
</script>
<template>
  <span class="reading-brand" :lang="contentLang(store.site.contentLocale)">
    <NuxtLink
      v-if="placement === 'header'"
      class="brand-link"
      to="/"
      :aria-label="store.site.title"
      ><SakuraFlower class="brand-flower" /><SakuraWordmark
    /></NuxtLink>
    <span v-else class="brand-link" role="img" :aria-label="store.site.title"
      ><SakuraFlower class="brand-flower" /><SakuraWordmark
    /></span>
  </span>
</template>
<style scoped>
.reading-brand,
.brand-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.brand-flower {
  width: calc(var(--wordmark-width, 60px) * 0.45);
  height: calc(var(--wordmark-width, 60px) * 0.45);
  margin-right: 10px;
}
.brand-link:focus-visible {
  outline: 2px solid var(--reading-interaction, var(--sakura-accent-strong));
  outline-offset: 4px;
}
</style>
