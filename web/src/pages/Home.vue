<template>
  <Layout>
    <template #header>
      <div v-if="showHero" class="headertop">
        <div class="hero-content">
          <h1>{{ siteStore.config.title }}</h1>
          <p>{{ siteStore.config.subtitle }}</p>
        </div>
      </div>
    </template>

    <div id="primary" class="content-area">
      <div id="main" class="site-main">
        <h1 class="main-title flex-child-center">
          <span class="iconify">🌸</span>
          <span>Discovery</span>
        </h1>

        <!-- Loading state -->
        <div v-if="loading" class="loading">
          <p>Loading posts...</p>
        </div>

        <!-- Posts List -->
        <div v-else-if="posts.length > 0" class="posts-container">
          <article
            v-for="post in posts"
            :key="post.id"
            class="post-item"
            itemscope
            itemtype="http://schema.org/BlogPosting"
          >
            <router-link :to="`/post/${post.id}`" class="post-link">
              <div v-if="post.cover" class="post-thumbnail">
                <img :src="post.cover" :alt="post.title" loading="lazy" />
              </div>
              <div class="post-content">
                <h2 class="post-title" itemprop="headline">{{ post.title }}</h2>
                <div class="post-meta">
                  <span class="post-author">{{ post.author.name }}</span>
                  <span class="post-date">{{ formatDate(post.publishedAt) }}</span>
                  <span class="post-views">👁️ {{ post.views }}</span>
                </div>
                <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
                <div class="post-tags">
                  <span v-for="tag in post.tags" :key="tag.id" class="tag">{{ tag.name }}</span>
                </div>
              </div>
            </router-link>
          </article>
        </div>

        <!-- Empty State -->
        <div v-else class="no-posts">
          <p>No posts found.</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1" class="pagination-btn">
            Previous
          </button>
          <span class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-btn">
            Next
          </button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import { useSiteStore } from '../stores/site';
import { api } from '../services/api';
import type { Post } from '../services/api';

const siteStore = useSiteStore();
const posts = ref<Post[]>([]);
const currentPage = ref(1);
const totalPages = ref(1);
const loading = ref(true);
const showHero = ref(true);

async function fetchPosts() {
  loading.value = true;
  try {
    const response = await api.getPosts({ page: currentPage.value });
    posts.value = response.items;
    totalPages.value = response.totalPages;
  } catch (e) {
    console.error('Failed to fetch posts:', e);
    posts.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPosts);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchPosts();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchPosts();
  }
}
</script>

<style scoped>
.headertop {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #FE9A9A 0%, #FE7C7C 100%);
  color: white;
  text-align: center;
}

.hero-content h1 {
  margin: 0 0 1rem 0;
  font-size: 3rem;
  font-weight: 700;
}

.hero-content p {
  margin: 0;
  font-size: 1.25rem;
  opacity: 0.9;
}

.main-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 2rem 0;
  font-size: 2rem;
  font-weight: 600;
  color: #FE9A9A;
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

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f5f5f5;
  color: #666;
  border-radius: 4px;
  font-size: 0.75rem;
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
  margin-top: 3rem;
  padding: 2rem 0;
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

.pagination-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #666;
}

@media (max-width: 768px) {
  .post-link {
    flex-direction: column;
  }

  .post-thumbnail {
    width: 100%;
    height: 200px;
  }

  .hero-content h1 {
    font-size: 2rem;
  }
}
</style>
