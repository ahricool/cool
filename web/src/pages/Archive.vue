<template>
  <Layout>
    <template #header>
      <div class="archive-header">
        <h1>Archive</h1>
        <p>{{ totalPosts }} posts in total</p>
      </div>
    </template>

    <div id="primary" class="content-area">
      <div v-if="loading" class="loading">
        <p>Loading archive...</p>
      </div>

      <div v-else-if="groupedPosts.length > 0" class="archive-container">
        <div v-for="group in groupedPosts" :key="group.year" class="archive-year">
          <h2 class="year-title">{{ group.year }}</h2>
          <div class="posts-list">
            <article
              v-for="post in group.posts"
              :key="post.id"
              class="archive-post"
            >
              <router-link :to="`/post/${post.slug}`" class="post-link">
                <span class="post-date">{{ formatMonthDay(post.publishedAt) }}</span>
                <span class="post-title">{{ post.title }}</span>
              </router-link>
            </article>
          </div>
        </div>
      </div>

      <div v-else class="no-posts">
        <p>No posts found.</p>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Layout from '../components/Layout.vue';
import { api } from '../services/api';
import type { Post } from '../services/api';

const posts = ref<Post[]>([]);
const loading = ref(false);
const totalPosts = ref(0);

const groupedPosts = computed(() => {
  const groups: { [key: string]: Post[] } = {};

  posts.value.forEach(post => {
    const year = new Date(post.publishedAt).getFullYear().toString();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(post);
  });

  return Object.entries(groups)
    .map(([year, yearPosts]) => ({
      year,
      posts: yearPosts.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ),
    }))
    .sort((a, b) => parseInt(b.year) - parseInt(a.year));
});

onMounted(async () => {
  loading.value = true;
  try {
    const response = await api.getPosts({ size: 200 });
    posts.value = response.items;
    totalPosts.value = response.total;
  } catch (e) {
    console.error('Failed to fetch archive posts:', e);
  } finally {
    loading.value = false;
  }
});

function formatMonthDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.archive-header {
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #FE9A9A 0%, #FE7C7C 100%);
  color: white;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.archive-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.archive-header p {
  margin: 0;
  font-size: 1.125rem;
  opacity: 0.9;
}

.archive-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.archive-year {
  margin-bottom: 3rem;
}

.archive-year:last-child {
  margin-bottom: 0;
}

.year-title {
  margin: 0 0 1.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #FE9A9A;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #FE9A9A;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.archive-post {
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

.archive-post:last-child {
  border-bottom: none;
}

.post-link {
  display: flex;
  align-items: center;
  gap: 2rem;
  text-decoration: none;
  color: inherit;
  transition: color 0.3s;
}

.post-link:hover {
  color: #FE9A9A;
}

.post-date {
  flex-shrink: 0;
  width: 80px;
  font-size: 0.875rem;
  color: #999;
  font-weight: 500;
}

.post-title {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 500;
}

.loading,
.no-posts {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

@media (max-width: 768px) {
  .archive-header h1 { font-size: 1.75rem; }
  .year-title { font-size: 1.5rem; }
  .post-link { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .post-date { width: auto; }
}
</style>
