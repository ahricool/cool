<script setup lang="ts">
import { formatDate, type Post } from '@cms/content';
defineProps<{ posts: Post[] }>();
</script>
<template>
  <article
    v-for="(post, index) in posts"
    :key="post.id"
    class="post post-list-thumb"
    :class="{ 'post-list-thumb-right': index % 2 === 1 }"
  >
    <div class="post-content-wrap">
      <div class="post-date flex-child-center">
        <SakuraIcon name="clock-circle-linear" /><span>{{
          post.author.displayName
        }}</span
        ><time :datetime="post.publishedAt ?? undefined">{{
          formatDate(post.publishedAt)
        }}</time>
      </div>
      <NuxtLink :to="`/posts/${post.slug}`" class="post-title"
        ><h1>{{ post.title }}</h1></NuxtLink
      >
      <div class="post-meta">
        <span class="flex-child-center">{{ post.commentCount }} 条评论</span
        ><span v-if="post.categories[0]" class="flex-child-center"
          ><NuxtLink
            :to="{
              path: '/categories',
              query: { category: post.categories[0].category.slug },
            }"
            >{{ post.categories[0].category.name }}</NuxtLink
          ></span
        >
      </div>
      <div class="float-content">
        <p>{{ post.excerpt }}</p>
        <div class="post-bottom">
          <NuxtLink
            :to="`/posts/${post.slug}`"
            class="button-normal flex-child-center"
            :aria-label="`阅读 ${post.title}`"
            >•••</NuxtLink
          >
        </div>
      </div>
    </div>
    <div class="post-thumb">
      <NuxtLink :to="`/posts/${post.slug}`"
        ><img
          :src="post.coverUrl || '/sakura/images/default/temp.webp'"
          :alt="post.title"
          width="430"
          height="300"
          loading="lazy"
      /></NuxtLink>
    </div>
  </article>
</template>
