<script setup lang="ts">
const { t, locale, routePath, contentLang } = useCoolI18n();
import type { Pagination, Post, Taxonomy } from '@cool/content';
const props = defineProps<{ kind: 'categories' | 'tags' }>();
const route = useRoute();
const api = useApi();
const slug = computed(() => String(route.params.slug ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const {
  data: terms,
  error: termError,
  refresh: refreshTerms,
} = await useAsyncData(
  () => `terms-${locale.value}-${props.kind}`,
  () => api<Taxonomy[]>(`/public/${props.kind}`),
);
const { data, pending, error, refresh } = await useAsyncData(
  () => `${locale.value}-${props.kind}-${slug.value}-${page.value}`,
  () =>
    slug.value
      ? api<Pagination<Post>>(
          `/public/${props.kind}/${encodeURIComponent(slug.value)}/posts`,
          { query: { page: page.value, pageSize: 8 } },
        )
      : Promise.resolve(null),
);
</script>
<template>
  <PageFrame
    :title="t(kind === 'categories' ? '分类' : '标签')"
    :content-class="kind"
  >
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
        :to="routePath(`/${kind}/${encodeURIComponent(term.slug)}`)"
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
