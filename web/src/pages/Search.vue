<template>
  <AppShell>
    <template #header>
      <PageBanner title="搜索" subtitle="通过标题与摘要查找内容" />
    </template>

    <div id="primary" class="content-area">
      <div class="search-form page-search-form">
        <input v-model="keyword" type="search" placeholder="输入关键词" @keyup.enter="submit" />
        <button type="button" @click="submit">搜索</button>
      </div>

      <div class="search-summary">共找到 {{ results.length }} 条结果</div>

      <PostCard v-for="(post, index) in results" :key="post.id" :post="post" :reverse="index % 2 === 1" />
      <div v-if="!results.length" class="post-list-empty">没有匹配的文章</div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import PostCard from '@/components/PostCard.vue';
import { useSiteStore } from '@/stores/site';

const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();
const keyword = ref(String(route.query.q || ''));

watch(() => route.query.q, (value) => {
  keyword.value = String(value || '');
});

const results = computed(() => {
  if (!keyword.value.trim()) {
    return siteStore.posts;
  }
  const query = keyword.value.toLowerCase();
  return siteStore.posts.filter((post) => {
    return [post.title, post.excerpt, post.tags.map((item) => item.name).join(' '), post.categories.map((item) => item.name).join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
});

function submit() {
  router.replace({ name: 'search', query: keyword.value.trim() ? { q: keyword.value.trim() } : {} });
}
</script>
