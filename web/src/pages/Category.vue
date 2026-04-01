<template>
  <Layout>
    <template #header>
      <div class="category-header">
        <h1>Category: {{ categoryName }}</h1>
        <p v-if="category">{{ category.count }} posts</p>
      </div>
    </template>

    <div id="primary" class="content-area">
      <div v-if="loading" class="loading">
        <p>Loading posts...</p>
      </div>

      <div v-else-if="posts.length > 0" class="posts-container">
        <article
          v-for="post in posts"
          :key="post.id"
          class="post-item"
        >
          <router-link :to="`/post/${post.id}`" class="post-link">
            <div v-if="post.cover" class="post-thumbnail">
              <img :src="post.cover" :alt="post.title" loading="lazy" />
            </div>
            <div class="post-content">
              <h2 class="post-title">{{ post.title }}</h2>
              <div class="post-meta">
                <span class="post-author">{{ post.author.name }}</span>
                <span class="post-date">{{ formatDate(post.publishedAt) }}</span>
              </div>
              <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
            </div>
          </router-link>
        </article>
      </div>

      <div v-else class="no-posts">
        <p>No posts found in this category.</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1" class="pagination-btn">Previous</button>
        <span class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-btn">Next</button>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Layout from '../components/Layout.vue';
import { api } from '../services/api';
import type { Post, Category } from '../services/api';

const route = useRoute();
const posts = ref<Post[]>([]);
const category = ref<Category | null>(null);
const categoryName = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const loading = ref(true);

async function fetchData() {
  loading.value = true;
  const categorySlug = route.params.category as string;
  try {
    const [categoryData, postsData] = await Promise.all([
      api.getCategory(categorySlug).catch(() => null),
      api.getPostsByCategory(categorySlug, { page: currentPage.value }),
    ]);
    category.value = categoryData;
    categoryName.value = categoryData?.name ?? categorySlug;
    posts.value = postsData.items;
    totalPages.value = postsData.totalPages;
  } catch (e) {
    console.error('Failed to fetch category posts:', e);
    posts.value = [];
    category.value = null;
    categoryName.value = categorySlug;
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.category,
  () => {
    currentPage.value = 1;
    void fetchData();
  },
  { immediate: true }
);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function prevPage() {
  if (currentPage.value > 1) { currentPage.value--; fetchData(); }
}

function nextPage() {
  if (currentPage.value < totalPages.value) { currentPage.value++; fetchData(); }
}
</script>

<style scoped>
.category-header {
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #FE9A9A 0%, #FE7C7C 100%);
  color: white;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.category-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.category-header p {
  margin: 0;
  font-size: 1.125rem;
  opacity: 0.9;
}

.posts-container {
  display: grid;
  gap: 2rem;
}

.post-item {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.post-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.post-link {
  display: flex;
  gap: 1.5rem;
  text-decoration: none;
  color: inherit;
}

.post-thumbnail {
  width: 300px;
  height: 200px;
  flex-shrink: 0;
  overflow: hidden;
}

.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-content {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.post-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.post-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.post-excerpt {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.loading,
.no-posts {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem 0;
}

.pagination-btn {
  padding: 0.5rem 1.5rem;
  background: #FE9A9A;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.pagination-btn:hover:not(:disabled) { opacity: 0.8; }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-info { color: #666; }

@media (max-width: 768px) {
  .post-link { flex-direction: column; }
  .post-thumbnail { width: 100%; }
  .category-header h1 { font-size: 1.75rem; }
}
</style>
