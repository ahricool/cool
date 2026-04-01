<template>
  <AppShell>
    <template #header>
      <HeroSection v-if="siteStore.data.theme.hero.enabled" />
    </template>

    <div id="primary" class="content-area">
      <div v-if="siteStore.data.noticeTitle" class="notice">
        <Icon icon="solar:volume-loud-linear" class="iconify" />
        <div class="notice-content" v-html="siteStore.data.noticeTitle"></div>
      </div>

      <FeatureCards />

      <div id="main" class="site-main">
        <h1 class="main-title flex-child-center" style="font-family: 'Ubuntu', sans-serif">
          <Icon icon="fa:envira" class="iconify" />
          <span>Discovery</span>
        </h1>

        <template v-if="pagedPosts.length">
          <PostCard v-for="(post, index) in pagedPosts" :key="post.id" :post="post" :reverse="index % 2 === 1" />
        </template>
        <div v-else class="post-list-empty">暂无文章</div>

        <div v-if="totalPages > 1" class="pagination-list">
          <button class="load-more-btn" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span>第 {{ page }} / {{ totalPages }} 页</span>
          <button class="load-more-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import AppShell from '@/components/AppShell.vue';
import FeatureCards from '@/components/FeatureCards.vue';
import HeroSection from '@/components/HeroSection.vue';
import PostCard from '@/components/PostCard.vue';
import { useSiteStore } from '@/stores/site';

const pageSize = 6;
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();

const page = computed(() => Number(route.query.page || 1));
const totalPages = computed(() => Math.max(1, Math.ceil(siteStore.posts.length / pageSize)));
const pagedPosts = computed(() => {
  const start = (page.value - 1) * pageSize;
  return siteStore.posts.slice(start, start + pageSize);
});

function changePage(nextPage: number) {
  router.push({ name: 'home', query: nextPage > 1 ? { page: String(nextPage) } : {} });
}
</script>
