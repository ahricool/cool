<script setup lang="ts">
import type { Pagination, Post } from '@cool/content';
import ArticleCard from '../components/ArticleCard.vue';
import ApiState from '../components/ApiState.vue';
import Pager from '../components/Pagination.vue';
const { t, locale } = useCoolI18n();
const route = useRoute();
const api = useApi();
const q = ref(String(route.query.q ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const term = computed(() => String(route.query.q ?? ''));
const searchFailure = ref(false);
const { data, pending, error, refresh } = await useAsyncData(
  () => `minimal-search-${locale.value}-${term.value}-${page.value}`,
  () =>
    term.value
      ? api<Pagination<Post>>('/public/search', {
          query: { q: term.value, page: page.value, pageSize: 8 },
        })
      : Promise.resolve(null),
);
watch(term, (value) => {
  q.value = value;
});
function search() {
  searchFailure.value = !q.value.trim();
  if (!searchFailure.value)
    void navigateTo({ path: '/search', query: { q: q.value.trim() } });
}
useHead(() => ({ title: t('搜索') }));
</script>
<template>
  <section class="minimal-search">
    <h1>{{ t('搜索') }}</h1>
    <form novalidate @submit.prevent="search">
      <label for="minimal-query">{{ t('寻找一段文字') }}</label>
      <div class="minimal-search-field">
        <input
          id="minimal-query"
          v-model="q"
          type="search"
          maxlength="100"
          :aria-invalid="searchFailure"
          :aria-describedby="searchFailure ? 'minimal-search-error' : undefined"
        /><button type="submit">{{ t('搜索') }}</button>
      </div>
      <p v-if="searchFailure" id="minimal-search-error" role="alert">
        {{ t('请输入搜索关键词。') }}
      </p>
    </form>
    <p v-if="data">{{ t('找到 {count} 篇文章', { count: data.total }) }}</p>
    <ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh"
    />
    <ArticleCard
      v-for="post in data?.items"
      :key="post.id"
      :post="post"
    /><Pager v-if="data" :total="data.total" :page="page" :page-size="8" />
  </section>
</template>
