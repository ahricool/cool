<script setup lang="ts">
const { t, formatDate, localePath, contentLang } = useCmsI18n();
import type { Post } from '@cms/content';
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
      <NuxtLink :to="localePath(`/posts/${post.slug}`)" class="post-title"
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
              localePath(
                `/categories/${encodeURIComponent(post.categories[0].category.slug)}`,
              )
            "
            :lang="contentLang(post.categories[0].category.contentLocale)"
            >{{ post.categories[0].category.name }}</NuxtLink
          ></span
        >
      </div>
      <div class="float-content">
        <p :lang="contentLang(post.contentLocale)">{{ post.excerpt }}</p>
        <div class="post-bottom">
          <NuxtLink
            :to="localePath(`/posts/${post.slug}`)"
            class="button-normal flex-child-center"
            :aria-label="t('阅读 {title}', { title: post.title })"
            >{{ t('阅读全文 →') }}</NuxtLink
          >
        </div>
      </div>
    </div>
    <div class="post-thumb">
      <NuxtLink :to="localePath(`/posts/${post.slug}`)"
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
