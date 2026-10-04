<script setup lang="ts">
const { t, locale, formatDate, contentLang } = useCoolI18n();
import { renderMarkdown, type Pagination, type Moment } from '@cool/content';
const route = useRoute();
const store = useSiteStore();
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data, pending, error, refresh } = await useAsyncData(
  () => `moments-${locale.value}-${page.value}`,
  () =>
    api<Pagination<Moment>>('/public/moments', {
      query: { page: page.value, pageSize: 10 },
    }),
);
</script>
<template>
  <PageFrame :title="t('瞬间')" content-class="moments"
    ><ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()" />
    <div class="moments-container">
      <ul class="moments-inner">
        <li v-for="moment in data?.items" :key="moment.id" class="moments-item">
          <div class="moment-container">
            <img
              class="avatar"
              :src="
                store.site.avatarUrl || '/sakura/images/default/avatar.webp'
              "
              :alt="store.site.authorName"
              width="48"
              height="48"
            />
            <div class="moment-inner">
              <div
                class="moment-content entry-content"
                :lang="contentLang(moment.contentLocale)"
                v-html="renderMarkdown(moment.content).html"
              ></div>
              <div class="moment-footer">
                <div class="moment-time flex-child-center">
                  <time>{{ formatDate(moment.publishedAt) }}</time>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <Pagination v-if="data" :total="data.total" :page="page" :page-size="10"
  /></PageFrame>
</template>
