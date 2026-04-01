<template>
  <Layout>
    <template #header>
      <div v-if="page" class="page-header">
        <div v-if="page.cover" class="page-cover">
          <img :src="page.cover" :alt="page.title" />
        </div>
        <div class="page-header-content">
          <h1>{{ page.title }}</h1>
        </div>
      </div>
    </template>

    <div v-if="page" id="primary" class="content-area">
      <article class="page-content">
        <div class="page-body" v-html="formattedContent"></div>
      </article>
    </div>

    <div v-else-if="loading" class="loading">
      <p>Loading page...</p>
    </div>

    <div v-else class="error">
      <p>Page not found.</p>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Layout from '../components/Layout.vue';
import { api } from '../services/api';
import type { Page } from '../services/api';
import { renderContent } from '../utils/renderContent';

const route = useRoute();
const page = ref<Page | null>(null);
const loading = ref(true);

async function fetchPage(slug: string) {
  loading.value = true;
  try {
    page.value = await api.getPageBySlug(slug);
  } catch (e) {
    console.error('Failed to fetch page:', e);
    page.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.slug,
  (slug) => {
    if (typeof slug === 'string' && slug) {
      fetchPage(slug);
    } else {
      page.value = null;
      loading.value = false;
    }
  },
  { immediate: true }
);

const formattedContent = computed(() => {
  if (!page.value) return '';
  return renderContent(page.value.content);
});
</script>

<style scoped>
.page-header {
  position: relative;
  margin-bottom: 2rem;
}

.page-cover {
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.page-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-header-content {
  padding: 2rem;
  background: white;
  margin-top: -2rem;
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-header-content h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
}

.page-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-body {
  line-height: 1.8;
  color: #333;
  font-size: 1.125rem;
}

.page-body :deep(h1),
.page-body :deep(h2),
.page-body :deep(h3) {
  margin: 2rem 0 1rem 0;
  color: #FE9A9A;
}

.page-body :deep(p) {
  margin: 1rem 0;
}

.page-body :deep(ul) {
  margin: 1rem 0;
  padding-left: 2rem;
}

.page-body :deep(li) {
  margin: 0.5rem 0;
}

.page-body :deep(a) {
  color: #FE9A9A;
  text-decoration: none;
  transition: opacity 0.3s;
}

.page-body :deep(a:hover) {
  opacity: 0.8;
  text-decoration: underline;
}

.loading,
.error {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

@media (max-width: 768px) {
  .page-header-content h1 { font-size: 1.75rem; }
  .page-cover { height: 200px; }
}
</style>
