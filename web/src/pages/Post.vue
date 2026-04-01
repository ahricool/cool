<template>
  <Layout>
    <template #header>
      <div v-if="post" class="post-header">
        <div v-if="post.cover" class="post-cover">
          <img :src="post.cover" :alt="post.title" />
        </div>
        <div class="post-header-content">
          <h1>{{ post.title }}</h1>
          <div class="post-meta">
            <span class="post-author">
              <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.name" class="author-avatar" />
              {{ post.author.name }}
            </span>
            <span class="post-date">{{ formatDate(post.publishedAt) }}</span>
            <span class="post-views">👁️ {{ post.views }}</span>
            <span class="post-likes">❤️ {{ post.likes }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="post" id="primary" class="content-area">
      <article class="post-content" itemscope itemtype="http://schema.org/BlogPosting">
        <div class="post-body" v-html="formattedContent"></div>

        <div class="post-footer">
          <div class="post-tags">
            <span class="tags-label">Tags:</span>
            <router-link
              v-for="tag in post.tags"
              :key="tag.id"
              :to="`/tag/${tag.slug}`"
              class="tag"
            >
              {{ tag.name }}
            </router-link>
          </div>

          <div class="post-categories">
            <span class="categories-label">Categories:</span>
            <router-link
              v-for="category in post.categories"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="category"
            >
              {{ category.name }}
            </router-link>
          </div>
        </div>
      </article>

      <!-- Author Profile -->
      <div class="author-profile">
        <div class="author-info">
          <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.name" class="author-avatar-large" />
          <div class="author-details">
            <h3>{{ post.author.name }}</h3>
          </div>
        </div>
      </div>

      <div class="comments-placeholder">
        <h3>Comments</h3>
        <p>Comment system will be integrated here.</p>
      </div>
    </div>

    <div v-else-if="loading" class="loading">
      <p>Loading post...</p>
    </div>

    <div v-else class="error">
      <p>Post not found.</p>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from '../components/Layout.vue';
import { api } from '../services/api';
import type { Post } from '../services/api';
import { renderContent } from '../utils/renderContent';

const route = useRoute();
const post = ref<Post | null>(null);
const loading = ref(true);

async function fetchPost(postSlug: string) {
  loading.value = true;
  try {
    post.value = await api.getPostBySlug(postSlug);
  } catch (e) {
    console.error('Failed to fetch post:', e);
    post.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.slug,
  (postSlug) => {
    if (typeof postSlug === 'string' && postSlug) {
      void fetchPost(postSlug);
    } else {
      post.value = null;
      loading.value = false;
    }
  },
  { immediate: true }
);

const formattedContent = computed(() => {
  if (!post.value) return '';
  return renderContent(post.value.content);
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.post-header {
  position: relative;
  margin-bottom: 2rem;
}

.post-cover {
  width: 100%;
  height: 400px;
  overflow: hidden;
}

.post-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-header-content {
  padding: 2rem;
  background: white;
  margin-top: -2rem;
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-header-content h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #666;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.post-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-body {
  line-height: 1.8;
  color: #333;
  font-size: 1.125rem;
}

.post-body :deep(h1),
.post-body :deep(h2),
.post-body :deep(h3) {
  margin: 2rem 0 1rem 0;
  color: #FE9A9A;
}

.post-body :deep(p) {
  margin: 1rem 0;
}

.post-body :deep(strong) {
  font-weight: 600;
  color: #FE9A9A;
}

.post-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.post-tags,
.post-categories {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tags-label,
.categories-label {
  font-weight: 600;
  color: #666;
}

.tag,
.category {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f5f5f5;
  color: #666;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.3s;
}

.tag:hover,
.category:hover {
  background: #FE9A9A;
  color: white;
}

.author-profile {
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.author-info {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.author-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.author-details h3 {
  margin: 0 0 0.5rem 0;
  color: #FE9A9A;
}

.comments-placeholder {
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  color: #666;
}

.loading,
.error {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

@media (max-width: 768px) {
  .post-header-content h1 {
    font-size: 1.75rem;
  }

  .post-cover {
    height: 250px;
  }

  .author-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>
