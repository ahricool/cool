<script setup lang="ts">
import type { Pagination, Post, Taxonomy } from '@cms/content';
const props = defineProps<{ kind: 'categories' | 'tags' }>();
const route = useRoute();
const api = useApi();
const filter = computed(() =>
  props.kind === 'categories' ? 'category' : 'tag',
);
const value = computed(() => String(route.query[filter.value] ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const {
  data: terms,
  error: termError,
  refresh: refreshTerms,
} = await useAsyncData(
  () => `terms-${props.kind}`,
  () => api<Taxonomy[]>(`/public/${props.kind}`),
);
const { data, pending, error, refresh } = await useAsyncData(
  () => `${props.kind}-${value.value}-${page.value}`,
  () =>
    value.value
      ? api<Pagination<Post>>('/public/posts', {
          query: { [filter.value]: value.value, page: page.value, pageSize: 8 },
        })
      : Promise.resolve(null),
);
</script>
<template>
  <PageFrame
    :title="kind === 'categories' ? '分类' : '标签'"
    :content-class="kind"
    ><div :class="`${kind}-container`">
      <div class="card-container">
        <div class="chip-container">
          <div class="card">
            <div class="card-content">
              <ApiState
                :error="termError"
                :empty="terms?.length === 0"
                @retry="refreshTerms()"
              />
              <div
                :class="
                  kind === 'categories' ? 'categories-chips' : 'tag-chips'
                "
              >
                <NuxtLink
                  v-for="term in terms"
                  :key="term.id"
                  :to="{ path: `/${kind}`, query: { [filter]: term.slug } }"
                  ><span
                    class="chip chip-default"
                    :class="{ selected: value === term.slug }"
                    >{{ term.name }}</span
                  ></NuxtLink
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template v-if="value"
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
