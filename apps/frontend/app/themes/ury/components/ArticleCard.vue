<script setup lang="ts">
import type { Post } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
import { useUryAppearance } from '../composables/useUryAppearance';
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
  featured?: boolean;
}>();
const { settings } = useUryAppearance();
const { t, formatDate, contentLang } = useCoolI18n();
</script>
<template>
  <article
    class="ury-story"
    :class="{ 'ury-story-featured': featured }"
    :lang="contentLang(post.contentLocale)"
  >
    <NuxtLink
      v-if="
        featured && settings.showCovers && resolveCustomImage(post.coverUrl)
      "
      :to="`/posts/${encodeURIComponent(post.slug)}`"
      :aria-label="post.title"
      class="ury-story-image"
    >
      <img :src="resolveCustomImage(post.coverUrl)!" alt="" loading="lazy" />
    </NuxtLink>
    <div class="ury-story-copy">
      <h2>
        <NuxtLink :to="`/posts/${encodeURIComponent(post.slug)}`">{{
          post.title
        }}</NuxtLink>
      </h2>
      <p class="ury-byline">
        <time :datetime="post.publishedAt ?? undefined">{{
          formatDate(post.publishedAt)
        }}</time
        ><span v-if="featured"> · {{ post.author.displayName }}</span>
      </p>
      <template v-if="featured">
        <p class="ury-excerpt">{{ post.excerpt }}</p>
        <NuxtLink
          class="ury-read-more"
          :to="`/posts/${encodeURIComponent(post.slug)}`"
          >{{ t('继续阅读') }} <span aria-hidden="true">↗</span></NuxtLink
        >
      </template>
    </div>
  </article>
</template>
