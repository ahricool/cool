<script setup lang="ts">
const { t, locale, contentLang } = useCmsI18n();
import type { Pagination, Post } from '@cms/content';
const store = useSiteStore();
const route = useRoute();
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data, pending, error, refresh } = await useAsyncData(
  () => `home-${locale.value}-${page.value}`,
  () =>
    api<Pagination<Post>>('/public/posts', {
      query: { page: page.value, pageSize: 8 },
    }),
);
</script>
<template>
  <PageFrame content-class="index"
    ><template #header><SakuraHero /></template>
    <div v-if="store.homepage.notice" class="notice">
      <span class="sakura-flower" aria-hidden="true"></span>
      <div
        class="notice-content"
        :lang="contentLang(store.homepage.contentLocale)"
      >
        {{ store.homepage.notice }}
      </div>
    </div>
    <div id="primary" class="content-area">
      <div id="main" class="site-main">
        <h2 class="main-title flex-child-center">
          <span class="sakura-flower" aria-hidden="true"></span>
          {{ t('发现故事') }}
        </h2>
        <ApiState
          :pending="pending"
          :error="error"
          :empty="data?.total === 0"
          @retry="refresh()"
        /><PostList v-if="data" :posts="data.items" />
      </div>
      <Pagination
        v-if="data"
        :total="data.total"
        :page="page"
        :page-size="8"
      /></div
  ></PageFrame>
</template>
