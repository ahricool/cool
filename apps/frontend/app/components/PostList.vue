<script setup lang="ts">
const { t, formatDate, routePath, contentLang } = useCoolI18n();
import type { Post } from '@cool/content';
defineProps<{ posts: Post[] }>();
</script>
<template>
  <article v-for="post in posts" :key="post.id" class="post story-card">
    <div class="story-body">
      <div class="story-byline flex-child-center">
        <SakuraIcon name="clock-circle-linear" /><span>{{
          post.author.displayName
        }}</span
        ><time :datetime="post.publishedAt ?? undefined">{{
          formatDate(post.publishedAt)
        }}</time>
      </div>
      <NuxtLink :to="routePath(`/posts/${post.slug}`)" class="story-title"
        ><h2 :lang="contentLang(post.contentLocale)">
          {{ post.title }}
        </h2></NuxtLink
      >
      <div class="post-meta">
        <span class="flex-child-center">{{
          t(post.commentCount === 1 ? '1 条评论' : '{count} 条评论', {
            count: post.commentCount,
          })
        }}</span
        ><span v-if="post.categories[0]" class="flex-child-center"
          ><NuxtLink
            :to="
              routePath(
                `/categories/${encodeURIComponent(post.categories[0].category.slug)}`,
              )
            "
            :lang="contentLang(post.categories[0].category.contentLocale)"
            >{{ post.categories[0].category.name }}</NuxtLink
          ></span
        >
      </div>
      <div class="story-summary">
        <p :lang="contentLang(post.contentLocale)">{{ post.excerpt }}</p>
        <div class="story-action">
          <NuxtLink
            :to="routePath(`/posts/${post.slug}`)"
            class="button-normal flex-child-center"
            :aria-label="t('阅读 {title}', { title: post.title })"
            >{{ t('阅读全文 →') }}</NuxtLink
          >
        </div>
      </div>
    </div>
    <div class="story-cover">
      <NuxtLink :to="routePath(`/posts/${post.slug}`)"
        ><img
          :src="post.coverUrl || '/sakura/images/default/temp.webp'"
          :alt="post.title"
          :lang="contentLang(post.contentLocale)"
          width="430"
          height="300"
          loading="lazy"
      /></NuxtLink>
    </div>
  </article>
</template>
