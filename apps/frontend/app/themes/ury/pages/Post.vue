<script setup lang="ts">
import { useUryAppearance } from '../composables/useUryAppearance';
import { renderMarkdown, type Post } from '@cool/content';
import { resolveCustomImage } from '~/utils/custom-image';
import ApiState from '../components/ApiState.vue';
import mark from '../assets/mark.svg';
const { t, contentLang, formatDate } = useCoolI18n();
const store = useSiteStore();
const { settings } = useUryAppearance();
const { data, pending, error, refresh } = await usePublicDocument<Post>('post');
const rendered = computed(() => renderMarkdown(data.value?.content ?? ''));
const copied = ref(false);
async function share() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
useHead(() => ({
  title: data.value
    ? `${data.value.title} | ${store.site.title}`
    : store.site.title,
}));
</script>
<template>
  <ApiState :pending="pending" :error="error" @retry="refresh" />
  <article
    v-if="data"
    class="ury-document"
    :lang="contentLang(data.contentLocale)"
  >
    <header class="ury-document-header">
      <p class="ury-byline">
        {{ data.author.displayName }} · {{ formatDate(data.publishedAt) }}
      </p>
      <h1>{{ data.title }}</h1>
    </header>
    <img
      v-if="settings.showCovers && resolveCustomImage(data.coverUrl)"
      class="ury-cover"
      :src="resolveCustomImage(data.coverUrl)!"
      alt=""
    />
    <details v-if="rendered.toc.length" class="ury-toc">
      <summary>{{ t('文章目录') }}</summary>
      <ol>
        <li v-for="heading in rendered.toc" :key="heading.id">
          <a :href="`#${heading.id}`">{{ heading.text }}</a>
        </li>
      </ol>
    </details>
    <div class="ury-prose" v-html="rendered.html" />
    <footer class="ury-document-footer">
      <div class="ury-tags">
        <NuxtLink
          v-for="tag in data.tags"
          :key="tag.tag.id"
          :lang="contentLang(tag.tag.contentLocale)"
          :to="`/tags/${encodeURIComponent(tag.tag.slug)}`"
          >#{{ tag.tag.name }}</NuxtLink
        >
      </div>
      <button @click="share">{{ t('分享') }}</button
      ><span v-if="copied" role="status">{{ t('链接已复制') }}</span>
      <div class="ury-author">
        <img
          v-if="settings.showAvatar"
          :src="resolveCustomImage(data.author.avatarUrl) ?? mark"
          width="48"
          height="48"
          :alt="data.author.displayName"
        />
        <p>{{ data.author.displayName }}<br />{{ store.site.authorBio }}</p>
      </div>
    </footer>
  </article>
</template>
