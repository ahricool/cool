<script setup lang="ts">
import ArticleCard from '~/themes/sakura/components/ArticleCard.vue';
import type { Post } from '@cool/content';
defineProps<{ posts: Post[] }>();
</script>
<template>
  <ArticleCard v-for="post in posts" :key="post.id" :post="post" />
</template>
