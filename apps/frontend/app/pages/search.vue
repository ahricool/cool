<script setup lang="ts">
const { t, locale, routePath } = useCoolI18n();
import type { Pagination, Post } from '@cool/content';
const route = useRoute();
const q = ref(String(route.query.q ?? ''));
const searchFailure = ref('');
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const term = computed(() => String(route.query.q ?? ''));
const { data, pending, error, refresh } = await useAsyncData(
  () => `search-${locale.value}-${term.value}-${page.value}`,
  () =>
    term.value
      ? api<Pagination<Post>>('/public/search', {
          query: { q: term.value, page: page.value, pageSize: 8 },
        })
      : Promise.resolve(null),
);
watch(
  () => route.query.q,
  (value) => {
    q.value = String(value ?? '');
  },
);
function search() {
  searchFailure.value = q.value.trim() ? '' : '请输入搜索关键词。';
  if (searchFailure.value) return;
  void navigateTo({
    path: routePath('/search'),
    query: { q: q.value.trim() },
  });
}
</script>
<template>
  <PageFrame :title="t('搜索')" content-class="search"
    ><form class="cool-search" novalidate @submit.prevent="search">
      <label for="query">{{ t('寻找一段文字') }}</label>
      <div>
        <input
          id="query"
          v-model="q"
          :aria-invalid="!!searchFailure"
          :aria-describedby="searchFailure ? 'search-query-error' : undefined"
          type="search"
          maxlength="100"
          :placeholder="t('输入关键词…')"
          required
        /><button>{{ t('搜索') }}</button>
      </div>
      <p v-if="searchFailure" id="search-query-error" role="alert">
        {{ t(searchFailure) }}
      </p>
    </form>
    <p v-if="data">
      {{
        t(data.total === 1 ? '找到 1 篇文章' : '找到 {count} 篇文章', {
          count: data.total,
        })
      }}
    </p>
    <ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()" /><PostList
      v-if="data"
      :posts="data.items" /><Pagination
      v-if="data"
      :total="data.total"
      :page="page"
      :page-size="8"
  /></PageFrame>
</template>
