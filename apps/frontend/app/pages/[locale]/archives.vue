<script setup lang="ts">
const { t, locale, formatDate, localePath, contentLang } = useCmsI18n();
import type { Pagination, Post } from '@cms/content';
const route = useRoute();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const api = useApi();
const { data, pending, error, refresh } = await useAsyncData(
  () => `archives-${locale.value}-${page.value}`,
  () =>
    api<Pagination<Post>>('/public/archives', {
      query: { page: page.value, pageSize: 30 },
    }),
);
const groups = computed(() =>
  Object.groupBy(data.value?.items ?? [], (p) =>
    formatDate(p.publishedAt, { year: 'numeric', month: 'long' }),
  ),
);
</script>
<template>
  <PageFrame :title="t('归档')" content-class="archives"
    ><ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()" />
    <article class="archives-article">
      <div id="archives-temp" class="archives-inner">
        <div class="archives-content">
          <div
            v-for="(posts, month) in groups"
            :key="month"
            class="archive-item active"
          >
            <div class="archive-title">
              <span class="archive-time flex-child-center">◷</span>
              <h3>{{ month }}</h3>
            </div>
            <div class="archive-posts">
              <div
                v-for="post in posts"
                :key="post.id"
                class="archive-post-item"
              >
                <span class="archive-post-circle"></span>
                <div class="arrow-left-ar"></div>
                <div class="brick">
                  <NuxtLink :to="localePath(`/posts/${post.slug}`)"
                    ><span class="time flex-child-center">{{
                      formatDate(post.publishedAt, {
                        month: 'short',
                        day: 'numeric',
                      })
                    }}</span
                    ><span :lang="contentLang(post.contentLocale)">{{
                      post.title
                    }}</span></NuxtLink
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
    <Pagination v-if="data" :total="data.total" :page="page" :page-size="30"
  /></PageFrame>
</template>
