<script setup lang="ts">
const { t, locale, contentLang } = useCoolI18n();
import { renderMarkdown, type Page } from '@cool/content';
const route = useRoute();
const api = useApi();
const { data, pending, error, refresh } = await useAsyncData(
  () => `page-${locale.value}-${route.params.slug}`,
  () =>
    api<Page>(`/public/pages/${encodeURIComponent(String(route.params.slug))}`),
);
</script>
<template>
  <PageFrame
    :title="data?.title ?? t('页面')"
    :title-lang="data ? contentLang(data.contentLocale) : undefined"
    :cover="data?.coverUrl"
    content-class="page"
    ><ApiState :pending="pending" :error="error" @retry="refresh()" />
    <article
      v-if="data"
      class="entry-content"
      :lang="contentLang(data.contentLocale)"
      v-html="renderMarkdown(data.content).html"
    ></article
  ></PageFrame>
</template>
