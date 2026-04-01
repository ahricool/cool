<template>
  <AppShell>
    <template #header>
      <PageBanner :title="authorTitle" :subtitle="siteStore.data.theme.author.bio || siteStore.data.site.description" :image="bannerImage" />
    </template>

    <div id="primary" class="content-area">
      <div class="author-profile-card">
        <img class="author-avatar" :src="authorImage" :alt="authorTitle" />
        <div>
          <h2>{{ authorTitle }}</h2>
          <p>{{ siteStore.data.theme.author.bio || '这个作者还没有填写简介。' }}</p>
          <p v-if="siteStore.data.theme.author.location">{{ siteStore.data.theme.author.location }}</p>
          <p v-if="siteStore.data.theme.author.email">{{ siteStore.data.theme.author.email }}</p>
        </div>
      </div>

      <h2 class="author-post-title">TA 的文章</h2>
      <PostCard v-for="(post, index) in authorPosts" :key="post.id" :post="post" :reverse="index % 2 === 1" />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import { DEFAULT_AUTHOR_AVATAR, DEFAULT_AUTHOR_BANNER } from '@/constants/assets';
import PostCard from '@/components/PostCard.vue';
import { useSiteStore } from '@/stores/site';

const siteStore = useSiteStore();
const authorTitle = computed(() => siteStore.data.theme.author.name || siteStore.data.site.title);
const authorImage = computed(() => siteStore.data.theme.author.avatar || siteStore.data.site.logo || DEFAULT_AUTHOR_AVATAR);
const bannerImage = computed(
  () => siteStore.data.theme.author.backgroundImage || siteStore.data.theme.hero.backgroundImage || DEFAULT_AUTHOR_BANNER
);
const authorPosts = computed(() => {
  const authorName = siteStore.data.theme.author.name;
  if (!authorName) {
    return siteStore.posts;
  }
  const filtered = siteStore.posts.filter((post) => post.author.name === authorName);
  return filtered.length ? filtered : siteStore.posts;
});
</script>
