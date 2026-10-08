<script setup lang="ts">
import ApiState from '~/themes/sakura/components/ApiState.vue';
import { renderMarkdown, type Page } from '@cool/content';
const { t, contentLang } = useCoolI18n();
const { data, pending, error, refresh } =
  await usePublicDocument<Page>('about');
useHead(() => ({ title: t('我') }));
</script>
<template>
  <div id="content" class="page-content about-page">
    <ApiState :pending="pending" :error="error" @retry="refresh()" />
    <article
      v-if="data"
      class="entry-content"
      :lang="contentLang(data.contentLocale)"
      v-html="renderMarkdown(data.content).html"
    ></article>
  </div>
</template>
<style scoped>
.about-page {
  max-width: 840px;
  padding-top: calc(var(--reading-header-height) + 48px);
}
</style>
