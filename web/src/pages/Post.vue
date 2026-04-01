<template>
  <AppShell>
    <template #header>
      <PageBanner v-if="post" :title="post.title" :subtitle="post.excerpt" :image="post.cover" />
    </template>

    <template #sidebar>
      <TocSidebar v-if="post" />
    </template>

    <div id="primary" class="content-area">
      <article v-if="post" :id="`post-${post.id}`" class="post-article" :data-owner="post.author.name">
        <div class="entry-content fancybox-content" itemprop="articleBody" v-html="html"></div>

        <footer class="post-footer">
          <div>
            <p class="flex-child-center">
              <span>Q.E.D.</span>
              <Icon icon="fa:meetup" class="iconify" style="color: #d34836" />
            </p>
          </div>
          <div class="post-footer-meta">
            <div class="post-license" itemprop="license">
              <a class="flex-child-center" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
                <Icon icon="fa:creative-commons" class="iconify" />
                <span>CC BY-NC-SA 4.0</span>
              </a>
            </div>
            <div class="post-tags flex-child-center">
              <Icon icon="system-uicons:tags" class="iconify" />
              <RouterLink v-for="tag in post.tags" :key="tag.id" :to="`/tag/${tag.slug}`">{{ tag.name }}</RouterLink>
            </div>
          </div>
        </footer>

        <div class="post-navigation">
          <RouterLink v-if="post.previousPost" :to="`/post/${post.previousPost.slug}`">上一篇：{{ post.previousPost.title }}</RouterLink>
          <RouterLink v-if="post.nextPost" :to="`/post/${post.nextPost.slug}`">下一篇：{{ post.nextPost.title }}</RouterLink>
        </div>
      </article>

      <div v-else class="post-list-empty">文章加载中...</div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { RouterLink, useRoute } from 'vue-router';
import tocbot from 'tocbot';
import AppShell from '@/components/AppShell.vue';
import PageBanner from '@/components/PageBanner.vue';
import TocSidebar from '@/components/TocSidebar.vue';
import { getPostBySlug, type PostDetail } from '@/services/api';
import { renderContent, highlightCodeBlocks } from '@/utils/content';

const route = useRoute();
const post = ref<PostDetail | null>(null);
const html = computed(() => renderContent(post.value?.content || ''));

async function fetchPost() {
  post.value = await getPostBySlug(String(route.params.slug));
  document.title = post.value.title;
  await nextTick();
  highlightCodeBlocks(document);
  tocbot.destroy();
  tocbot.init({
    tocSelector: '.toc',
    contentSelector: '.entry-content',
    headingSelector: 'h1, h2, h3, h4',
    hasInnerContainers: true,
  });
}

watch(() => route.params.slug, fetchPost);
onMounted(fetchPost);
</script>
