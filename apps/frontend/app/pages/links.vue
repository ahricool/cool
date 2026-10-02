<script setup lang="ts">
import type { Pagination, FriendLink } from '@cms/content';
const route = useRoute();
const api = useApi();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data, pending, error, refresh } = await useAsyncData(
  () => `links-${page.value}`,
  () =>
    api<Pagination<FriendLink>>('/public/links', {
      query: { page: page.value, pageSize: 30 },
    }),
);
const groups = computed(() =>
  Object.groupBy(data.value?.items ?? [], (p) => p.group),
);
</script>
<template>
  <PageFrame title="友链" content-class="links"
    ><ApiState
      :pending="pending"
      :error="error"
      :empty="data?.total === 0"
      @retry="refresh()" />
    <article class="link-article">
      <div class="links">
        <section v-for="(links, group) in groups" :key="group">
          <h3 class="link-title">
            <span class="fake-title">{{ group }}</span>
          </h3>
          <ul class="link-items">
            <li v-for="link in links" :key="link.id" class="link-item">
              <a
                class="link-item-inner"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                ><img
                  :src="link.logoUrl || '/sakura/images/default/avatar.webp'"
                  :alt="link.name"
                  width="65"
                  height="65"
                  loading="lazy"
                /><span class="sitename">{{ link.name }}</span>
                <div class="linkdes">{{ link.description }}</div></a
              >
            </li>
          </ul>
        </section>
      </div>
    </article>
    <Pagination v-if="data" :total="data.total" :page="page" :page-size="30"
  /></PageFrame>
</template>
