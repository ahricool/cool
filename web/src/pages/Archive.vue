<template>
  <AppShell>
    <template #header>
      <PageBanner title="归档" subtitle="按时间查看所有文章" />
    </template>

    <div id="primary" class="content-area">
      <section class="archives-page">
        <div v-for="group in groups" :key="group.year" class="archive-group">
          <h2>{{ group.year }} <small>({{ group.items.length }})</small></h2>
          <ul>
            <li v-for="post in group.items" :key="post.id">
              <RouterLink :to="`/post/${post.slug}`">{{ post.title }}</RouterLink>
              <time>{{ formatDate(post.publishedAt) }}</time>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import type { PostSummary } from '@/services/api';
import { useSiteStore } from '@/stores/site';
import { formatDate } from '@/utils/date';

const siteStore = useSiteStore();
const groups = computed(() => {
  const map = new Map<string, PostSummary[]>();
  siteStore.posts.forEach((post) => {
    const year = new Date(post.publishedAt).getFullYear().toString();
    const items = map.get(year) || [];
    items.push(post);
    map.set(year, items);
  });
  return Array.from(map.entries()).map(([year, items]) => ({ year, items }));
});
</script>
