<script setup lang="ts">
import type { Pagination, Post, Tag } from '@cool/content';
import ArticleCard from '../components/ArticleCard.vue';
import ApiState from '../components/ApiState.vue';
import Pager from '../components/Pagination.vue';
const { t, locale, contentLang } = useCoolI18n();
const route = useRoute();
const api = useApi();
const slug = computed(() => String(route.params.slug ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const {
  data: terms,
  pending: termsPending,
  error: termsError,
  refresh: refreshTerms,
} = await useAsyncData(
  () => `minimal-tags-${locale.value}`,
  () => api<Tag[]>('/public/tags'),
);
const { data, pending, error, refresh } = await useAsyncData(
  () => `minimal-tag-${locale.value}-${slug.value}-${page.value}`,
  () =>
    slug.value
      ? api<Pagination<Post>>(
          `/public/tags/${encodeURIComponent(slug.value)}/posts`,
          { query: { page: page.value, pageSize: 8 } },
        )
      : Promise.resolve(null),
);
usePublicNotFound(error);
useHead(() => ({ title: t('标签') }));
</script>
<template>
  <section>
    <h1>{{ t('标签') }}</h1>
    <ApiState
      :pending="termsPending"
      :error="termsError"
      :empty="terms?.length === 0"
      @retry="refreshTerms"
    />
    <div class="minimal-tags">
      <NuxtLink
        v-for="tag in terms"
        :key="tag.id"
        :lang="contentLang(tag.contentLocale)"
        :aria-current="slug === tag.slug ? 'page' : undefined"
        :to="`/tags/${encodeURIComponent(tag.slug)}`"
        >{{ tag.name }}</NuxtLink
      >
    </div>
    <template v-if="slug"
      ><ApiState
        :pending="pending"
        :error="error"
        :empty="data?.total === 0"
        @retry="refresh" /><ArticleCard
        v-for="post in data?.items"
        :key="post.id"
        :post="post" /><Pager
        v-if="data"
        :total="data.total"
        :page="page"
        :page-size="8"
    /></template>
  </section>
</template>
