<script setup lang="ts">
import ContentByline from '~/themes/sakura/components/ContentByline.vue';
import ArticleCard from '~/themes/sakura/components/ArticleCard.vue';
import { renderMarkdown, type TimelineItem } from '@cool/content';
defineProps<{ items: TimelineItem[] }>();
const store = useSiteStore();
const { contentLang } = useCoolI18n();
</script>
<template>
  <template v-for="item in items" :key="`${item.kind}:${item.id}`">
    <ArticleCard v-if="item.kind === 'post'" :post="item" />
    <article v-else class="timeline-update story-card">
      <ContentByline
        :author="item.author ?? store.site.author"
        :published-at="item.publishedAt"
      />
      <h2
        v-if="'title' in item && item.title"
        :lang="contentLang(item.contentLocale)"
      >
        {{ item.title }}
      </h2>
      <div
        class="entry-content"
        :lang="contentLang(item.contentLocale)"
        v-html="renderMarkdown(item.content).html"
      ></div>
    </article>
  </template>
</template>
