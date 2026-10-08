<script setup lang="ts">
import { renderMarkdown, type Page } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
import ApiState from '../components/ApiState.vue';
const { contentLang } = useCoolI18n();
const { data, pending, error, refresh } =
  await usePublicDocument<Page>('about');
useHead(() => ({ title: data.value?.title }));
</script>
<template>
  <ApiState :pending="pending" :error="error" @retry="refresh" />
  <article
    v-if="data"
    class="minimal-document"
    :lang="contentLang(data.contentLocale)"
  >
    <header class="minimal-document-header">
      <h1>{{ data.title }}</h1>
    </header>
    <img
      v-if="resolveCustomImage(data.coverUrl)"
      class="minimal-cover"
      :src="resolveCustomImage(data.coverUrl)!"
      alt=""
    />
    <div class="minimal-prose" v-html="renderMarkdown(data.content).html" />
  </article>
</template>
