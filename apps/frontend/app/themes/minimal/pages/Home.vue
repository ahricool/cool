<script setup lang="ts">
import { renderMarkdown } from '@cool/content';
import ArticleCard from '../components/ArticleCard.vue';
import ApiState from '../components/ApiState.vue';
const store = useSiteStore();
const { t, contentLang, formatDate } = useCoolI18n();
const { items, nextCursor, pending, error, started, loadMore } = useTimeline();
</script>
<template>
  <section
    class="minimal-introduction"
    :lang="contentLang(store.homepage.contentLocale)"
  >
    <p class="minimal-kicker">{{ store.site.title }}</p>
    <h1>{{ store.homepage.greeting }}</h1>
    <p>{{ store.homepage.description }}</p>
    <p v-if="store.homepage.notice" role="note">{{ store.homepage.notice }}</p>
  </section>
  <section class="minimal-feed" :aria-label="t('时间线')">
    <template v-for="item in items" :key="`${item.kind}:${item.id}`">
      <ArticleCard v-if="item.kind === 'post'" :post="item" />
      <article
        v-else
        class="minimal-note"
        :lang="contentLang(item.contentLocale)"
      >
        <p class="minimal-byline">
          {{ formatDate(item.publishedAt) }} ·
          {{ (item.author ?? store.site.author).displayName }}
        </p>
        <h2 v-if="'title' in item && item.title">{{ item.title }}</h2>
        <div class="minimal-prose" v-html="renderMarkdown(item.content).html" />
      </article>
    </template>
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
      class="minimal-byline"
    >
      {{ t('已读到最后') }}
    </p>
  </section>
</template>
