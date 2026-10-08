<script setup lang="ts">
import { renderMarkdown } from '@cool/content';
import ArticleCard from '../components/ArticleCard.vue';
import ApiState from '../components/ApiState.vue';
const store = useSiteStore();
const { t, contentLang, formatDate } = useCoolI18n();
const { items, nextCursor, pending, error, started, loadMore } = useTimeline();
const sentinel = ref<HTMLElement>();
useTimelineAutoload(sentinel, {
  nextCursor,
  pending,
  error,
  started,
  loadMore,
});
</script>
<template>
  <h1 class="ury-feed-title">{{ t('时间线') }}</h1>
  <section class="ury-feed" :aria-label="t('时间线')">
    <template v-for="item in items" :key="`${item.kind}:${item.id}`">
      <ArticleCard v-if="item.kind === 'post'" :post="item" featured />
      <article v-else class="ury-note" :lang="contentLang(item.contentLocale)">
        <p class="ury-byline">
          {{ formatDate(item.publishedAt) }} ·
          {{ (item.author ?? store.site.author).displayName }}
        </p>
        <h2 v-if="'title' in item && item.title">{{ item.title }}</h2>
        <div class="ury-prose" v-html="renderMarkdown(item.content).html" />
      </article>
    </template>
    <div ref="sentinel" class="ury-feed-sentinel" aria-live="polite">
      <ApiState
        :pending="pending"
        :error="error"
        :empty="started && !items.length"
        @retry="loadMore"
      />
      <button v-if="nextCursor && !pending && !error" @click="loadMore">
        {{ t('加载更多') }}
      </button>
      <p
        v-else-if="started && items.length && !pending && !error"
        class="ury-byline"
      >
        {{ t('已读到最后') }}
      </p>
    </div>
  </section>
</template>
