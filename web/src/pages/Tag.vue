<template>
  <AppShell>
    <template #header>
      <PageBanner :title="tag?.name || '标签'" :subtitle="`共 ${posts.length} 篇文章`" />
    </template>

    <div id="primary" class="content-area">
      <PostCard v-for="(post, index) in posts" :key="post.id" :post="post" :reverse="index % 2 === 1" />
      <div v-if="!posts.length" class="post-list-empty">该标签下还没有文章</div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import PostCard from '@/components/PostCard.vue';
import { useSiteStore } from '@/stores/site';

const route = useRoute();
const siteStore = useSiteStore();
const slug = computed(() => String(route.params.slug));
const tag = computed(() => siteStore.data.tags.find((item) => item.slug === slug.value));
const posts = computed(() => siteStore.posts.filter((post) => post.tags.some((item) => item.slug === slug.value)));
</script>
