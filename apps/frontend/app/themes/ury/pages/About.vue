<script setup lang="ts">
import { useUryAppearance } from '../composables/useUryAppearance';
import { renderMarkdown, type Page } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
import ApiState from '../components/ApiState.vue';
const { contentLang } = useCoolI18n();
const { settings } = useUryAppearance();
const { data, pending, error, refresh } =
  await usePublicDocument<Page>('about');
useHead(() => ({ title: data.value?.title }));
</script>
<template>
  <ApiState :pending="pending" :error="error" @retry="refresh" />
  <article
    v-if="data"
    class="ury-document"
    :lang="contentLang(data.contentLocale)"
  >
    <header class="ury-document-header">
      <h1>{{ data.title }}</h1>
    </header>
    <img
      v-if="settings.showCovers && resolveCustomImage(data.coverUrl)"
      class="ury-cover"
      :src="resolveCustomImage(data.coverUrl)!"
      alt=""
    />
    <div class="ury-prose" v-html="renderMarkdown(data.content).html" />
  </article>
</template>
