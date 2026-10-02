<script setup lang="ts">
import { renderMarkdown, type Page } from '@cms/content';
const route = useRoute();
const api = useApi();
const { data, pending, error, refresh } = await useAsyncData(
  () => `page-${route.params.slug}`,
  () =>
    api<Page>(`/public/pages/${encodeURIComponent(String(route.params.slug))}`),
);
</script>
<template>
  <PageFrame
    :title="data?.title ?? '页面'"
    :cover="data?.coverUrl"
    content-class="page"
    ><ApiState :pending="pending" :error="error" @retry="refresh()" />
    <article
      v-if="data"
      class="entry-content"
      v-html="renderMarkdown(data.content).html"
    ></article
  ></PageFrame>
</template>
