<template>
  <AppShell>
    <template #header>
      <PageBanner v-if="page" :title="page.title" :image="page.cover" />
    </template>

    <div id="primary" class="content-area">
      <article v-if="page" class="post-article link-article">
        <div class="entry-content fancybox-content" v-html="html"></div>
      </article>
      <div v-else class="post-list-empty">页面加载中...</div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import { getPageBySlug, type PageDetail } from '@/services/api';
import { renderContent } from '@/utils/content';

const route = useRoute();
const page = ref<PageDetail | null>(null);
const html = computed(() => renderContent(page.value?.content || ''));

async function fetchPage() {
  page.value = await getPageBySlug(String(route.params.slug));
  document.title = page.value.title;
}

watch(() => route.params.slug, fetchPage);
onMounted(fetchPage);
</script>
