<script setup lang="ts">
import type { Author, ContentLocale } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
defineProps<{
  post: {
    id: string;
    slug: string;
    coverUrl: string | null;
    title: string;
    excerpt: string;
    publishedAt: string | null;
    author: Pick<Author, 'displayName' | 'avatarUrl'>;
    contentLocale?: ContentLocale;
  };
}>();
const { t, contentLang } = useCoolI18n();

</script>
<template>
  <article class="post story-card">
    <NuxtLink
      v-if="resolveCustomImage(post.coverUrl)"
      :to="`/posts/${post.slug}`"
      class="story-cover"
      :aria-label="post.title"
    >
      <img
        v-if="resolveCustomImage(post.coverUrl)"
        :src="resolveCustomImage(post.coverUrl)!"
        alt=""
        width="960"
        height="480"
        loading="lazy"
      />

    </NuxtLink>
    <div class="story-body">
      <NuxtLink :to="`/posts/${post.slug}`" class="story-title"
        ><h2 :lang="contentLang(post.contentLocale)">
          {{ post.title }}
        </h2></NuxtLink
      >
      <ContentByline :author="post.author" :published-at="post.publishedAt" />
      <div class="story-summary" :lang="contentLang(post.contentLocale)">
        <p
          v-for="(paragraph, index) in post.excerpt
            .split(/\n\s*\n/)
            .filter(Boolean)"
          :key="index"
        >
          {{ paragraph }}
        </p>
      </div>
      <NuxtLink
        :to="`/posts/${post.slug}`"
        class="story-action"
        :aria-label="t('阅读 {title}', { title: post.title })"
        >{{ t('阅读全文 →') }}</NuxtLink
      >
    </div>
  </article>
</template>
