<template>
  <article class="post post-list-thumb" :class="{ 'post-list-thumb-right': reverse }" itemscope itemtype="http://schema.org/Article">
    <div class="post-content-wrap">
      <div class="post-date flex-child-center">
        <Icon icon="solar:clock-circle-linear" class="iconify" />
        <span>{{ post.author.name }}</span>
        <time class="publish-time" :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
      </div>
      <RouterLink :to="`/post/${post.slug}`" class="post-title">
        <h1>{{ post.title }}</h1>
      </RouterLink>
      <div class="post-meta">
        <span class="flex-child-center">
          <Icon icon="solar:eye-linear" class="iconify" />
          <span>{{ post.views }} 热度</span>
        </span>
        <span v-if="post.categories.length" class="flex-child-center">
          <Icon icon="solar:folder-with-files-outline" class="iconify" />
          <RouterLink :to="`/category/${post.categories[0].slug}`">{{ post.categories[0].name }}</RouterLink>
        </span>
      </div>
      <div class="float-content">
        <p>{{ post.excerpt }}</p>
        <div class="post-bottom">
          <RouterLink :to="`/post/${post.slug}`" class="button-normal flex-child-center">
            <Icon icon="akar-icons:more-horizontal-fill" class="iconify" />
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="post-thumb">
      <RouterLink :to="`/post/${post.slug}`">
        <img v-if="post.cover" :src="post.cover" :alt="post.title" width="430" height="300" />
        <div v-else class="post-thumb-placeholder">{{ post.title }}</div>
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { RouterLink } from 'vue-router';
import type { PostSummary } from '@/services/api';
import { formatDate } from '@/utils/date';

defineProps<{
  post: PostSummary;
  reverse?: boolean;
}>();
</script>
