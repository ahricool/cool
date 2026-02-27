<template>
  <aside class="sidebar-widget">
    <!-- About Widget -->
    <div class="widget widget-about">
      <h3 class="widget-title">About</h3>
      <div class="widget-content">
        <p>{{ siteStore.config.description || siteStore.config.subtitle }}</p>
      </div>
    </div>

    <!-- Recent Posts Widget -->
    <div class="widget widget-recent-posts">
      <h3 class="widget-title">Recent Posts</h3>
      <div class="widget-content">
        <ul class="post-list">
          <li v-for="post in recentPosts" :key="post.id">
            <router-link :to="`/post/${post.id}`">
              {{ post.title }}
            </router-link>
            <span class="post-date">{{ formatDate(post.publishedAt) }}</span>
          </li>
        </ul>
        <p v-if="recentPosts.length === 0" class="empty-hint">No posts yet.</p>
      </div>
    </div>

    <!-- Tags Widget -->
    <div class="widget widget-tags">
      <h3 class="widget-title">Tags</h3>
      <div class="widget-content">
        <div class="tag-cloud">
          <router-link
            v-for="tag in tags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="tag-item"
          >
            {{ tag.name }}
          </router-link>
        </div>
        <p v-if="tags.length === 0" class="empty-hint">No tags yet.</p>
      </div>
    </div>

    <!-- Categories Widget -->
    <div class="widget widget-categories">
      <h3 class="widget-title">Categories</h3>
      <div class="widget-content">
        <ul class="category-list">
          <li v-for="category in categories" :key="category.id">
            <router-link :to="`/category/${category.slug}`">
              {{ category.name }} ({{ category.count }})
            </router-link>
          </li>
        </ul>
        <p v-if="categories.length === 0" class="empty-hint">No categories yet.</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSiteStore } from '../stores/site';
import { api } from '../services/api';
import type { Post, Tag, Category } from '../services/api';

const siteStore = useSiteStore();
const recentPosts = ref<Post[]>([]);
const tags = ref<Tag[]>([]);
const categories = ref<Category[]>([]);

onMounted(async () => {
  try {
    const [postsData, tagsData, categoriesData] = await Promise.all([
      api.getPosts({ size: 5 }),
      api.getTags(),
      api.getCategories(),
    ]);
    recentPosts.value = postsData.items;
    tags.value = tagsData;
    categories.value = categoriesData;
  } catch (e) {
    console.warn('Failed to load sidebar data:', e);
  }
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.sidebar-widget {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.widget {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.widget-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #FE9A9A;
  border-bottom: 2px solid #FE9A9A;
  padding-bottom: 0.5rem;
}

.widget-content {
  color: #666;
  line-height: 1.6;
}

.post-list,
.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-list li,
.category-list li {
  margin-bottom: 0.75rem;
}

.post-list li {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.post-list a,
.category-list a {
  color: #333;
  text-decoration: none;
  transition: color 0.3s;
}

.post-list a:hover,
.category-list a:hover {
  color: #FE9A9A;
}

.post-date {
  font-size: 0.75rem;
  color: #999;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f5f5f5;
  color: #666;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.3s;
}

.tag-item:hover {
  background: #FE9A9A;
  color: white;
}

.empty-hint {
  margin: 0;
  font-size: 0.875rem;
  color: #aaa;
  font-style: italic;
}
</style>
