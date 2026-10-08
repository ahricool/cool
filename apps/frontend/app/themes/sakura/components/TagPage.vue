<script setup lang="ts">
import Pagination from '~/themes/sakura/components/Pagination.vue';
import PostList from '~/themes/sakura/components/PostList.vue';
import PageFrame from '~/themes/sakura/components/PageFrame.vue';
import ApiState from '~/themes/sakura/components/ApiState.vue';
const { t, locale, routePath, contentLang } = useCoolI18n();
import type { Pagination as PaginationResult, Post, Tag } from '@cool/content';

const route = useRoute();
const api = useApi();
const slug = computed(() => String(route.params.slug ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const {
  data: terms,
  error: termError,
  refresh: refreshTerms,
} = await useAsyncData(
  () => `terms-${locale.value}-tags`,
  () => api<Tag[]>(`/public/tags`),
);
const { data, pending, error, refresh } = await useAsyncData(
  () => `${locale.value}-tags-${slug.value}-${page.value}`,
  () =>
    slug.value
      ? api<PaginationResult<Post>>(
          `/public/tags/${encodeURIComponent(slug.value)}/posts`,
          { query: { page: page.value, pageSize: 8 } },
        )
      : Promise.resolve(null),
);
usePublicNotFound(error);
</script>
<template>
  <PageFrame :title="t('标签')" content-class="tags">
    <ApiState
      :error="termError"
      :empty="terms?.length === 0"
      @retry="refreshTerms()" />
    <div class="taxonomy-terms">
      <NuxtLink
        v-for="term in terms"
        :key="term.id"
        class="chip"
        :class="{ selected: slug === term.slug }"
        :to="routePath(`/tags/${encodeURIComponent(term.slug)}`)"
        :lang="contentLang(term.contentLocale)"
        >{{ term.name }}</NuxtLink
      >
    </div>
    <template v-if="slug"
      ><ApiState
        :pending="pending"
        :error="error"
        :empty="data?.total === 0"
        @retry="refresh()" /><PostList
        v-if="data"
        :posts="data.items" /><Pagination
        v-if="data"
        :total="data.total"
        :page="page"
        :page-size="8" /></template
  ></PageFrame>
</template>
