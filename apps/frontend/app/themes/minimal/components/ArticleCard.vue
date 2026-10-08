<script setup lang="ts">
import type { Post } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
defineProps<{
  post: Pick<
    Post,
    | 'slug'
    | 'title'
    | 'excerpt'
    | 'coverUrl'
    | 'publishedAt'
    | 'author'
    | 'contentLocale'
  >;
}>();
const { formatDate, contentLang } = useCoolI18n();
</script>
<template>
  <article class="minimal-story" :lang="contentLang(post.contentLocale)">
    <div class="minimal-story-copy">
      <p class="minimal-byline">
        {{ formatDate(post.publishedAt) }} · {{ post.author.displayName }}
      </p>
      <h2>
        <NuxtLink :to="`/posts/${encodeURIComponent(post.slug)}`">{{
          post.title
        }}</NuxtLink>
      </h2>
      <p>{{ post.excerpt }}</p>
    </div>
    <NuxtLink
      v-if="resolveCustomImage(post.coverUrl)"
      :to="`/posts/${encodeURIComponent(post.slug)}`"
      :aria-label="post.title"
    >
      <img
        :src="resolveCustomImage(post.coverUrl)!"
        width="240"
        height="160"
        alt=""
        loading="lazy"
      />
    </NuxtLink>
  </article>
</template>
