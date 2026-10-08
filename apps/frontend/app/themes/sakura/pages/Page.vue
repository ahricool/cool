<script setup lang="ts">
import PageFrame from '~/themes/sakura/components/PageFrame.vue';
import ApiState from '~/themes/sakura/components/ApiState.vue';
const { t, contentLang } = useCoolI18n();
import { renderMarkdown, type Page } from '@cool/content';
const { data, pending, error, refresh } = await usePublicDocument<Page>('page');
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
