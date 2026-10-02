<script setup lang="ts">
import type { Pagination, Post } from '@cms/content';
const route = useRoute();
const q = ref(String(route.query.q ?? ''));
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const term = computed(() => String(route.query.q ?? ''));
const { data, pending, error, refresh } = await useAsyncData(
  () => `search-${term.value}-${page.value}`,
  () =>
    term.value
      ? api<Pagination<Post>>('/public/search', {
          query: { q: term.value, page: page.value, pageSize: 8 },
        })
      : Promise.resolve(null),
);
function search() {
  void navigateTo({ path: '/search', query: { q: q.value.trim() } });
}
</script>
<template>
  <PageFrame title="搜索" content-class="search"
    ><form class="cms-search" @submit.prevent="search">
      <label for="query">寻找一段文字</label>
      <div>
        <input
          id="query"
          v-model="q"
          type="search"
          maxlength="100"
          placeholder="输入关键词…"
          required
        /><button>搜索</button>
      </div>
    </form>
    <p v-if="data">找到 {{ data.total }} 篇文章</p>
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
