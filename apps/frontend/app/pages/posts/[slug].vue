<script setup lang="ts">
import { resolveCustomImage } from '~/utils/custom-image';
import { renderMarkdown, type Post } from '@cool/content';
const { t, locale, formatDate, routePath, contentLang } = useCoolI18n();
const route = useRoute();
const store = useSiteStore();
const api = useApi();
const slug = computed(() => String(route.params.slug));
const { data, pending, error, refresh } = await useAsyncData(
  () => `post-${locale.value}-${slug.value}`,
  () => api<Post>(`/public/posts/${encodeURIComponent(slug.value)}`),
);
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
  <PageFrame
    :cover="data?.coverUrl"
    :title="data?.title ?? t('文章')"
    :title-lang="data ? contentLang(data.contentLocale) : undefined"
    content-class="post"
    ><template #header
      ><div class="post-header">
        <PageHeader
          fallback="cover"
          :seed="slug"
          :title="data?.title ?? t('文章')"
          :title-lang="data ? contentLang(data.contentLocale) : undefined"
          :cover="data?.coverUrl"
          ><div v-if="data" class="post-meta">
            <div class="meta-container">
              <span class="post-meta-item"
                ><span
                  >{{ data.author.displayName }} ·
                  {{ formatDate(data.publishedAt) }}</span
                ></span
              >
            </div>
          </div></PageHeader
        >
      </div></template
    ><ApiState :pending="pending" :error="error" @retry="refresh()" />
    <div v-if="data" id="primary" class="content-area">
      <aside
        v-if="rendered.toc.length"
        class="toc-sidebar"
        :aria-label="t('文章目录')"
      >
        <details open>
          <summary>{{ t('文章目录') }}</summary>
          <a
            v-for="heading in rendered.toc"
            :key="heading.id"
            :href="`#${heading.id}`"
            :lang="contentLang(data.contentLocale)"
            :style="{ paddingLeft: `${(heading.level - 1) * 10}px` }"
            >{{ heading.text }}</a
          >
        </details>
      </aside>
      <article
        :id="`post-${data.id}`"
        class="post-article"
        :lang="contentLang(data.contentLocale)"
      >
        <div
          class="entry-content"
          :lang="contentLang(data.contentLocale)"
          v-html="rendered.html"
        ></div>
        <footer class="post-footer" :lang="contentLang(locale)">
          <div>
            <p class="flex-child-center">{{ t('全文完') }} ❀</p>
          </div>
          <div class="post-footer-meta">
            <div class="post-tags flex-child-center">
              <NuxtLink
                v-for="tag in data.tags"
                :key="tag.tag.id"
                :lang="contentLang(tag.tag.contentLocale)"
                :to="routePath(`/tags/${encodeURIComponent(tag.tag.slug)}`)"
                >#{{ tag.tag.name }}</NuxtLink
              >
            </div>
            <button @click="share">
              {{ t(copied ? '链接已复制' : '分享 · 复制链接') }}
            </button>
          </div>
        </footer>
      </article>
      <section class="author-profile">
        <AvatarImage
          :src="resolveCustomImage(data.author.avatarUrl, store.site.avatarUrl)"
          :alt="data.author.displayName"
          :width="80"
          :height="80"
        />
        <div>
          <h3>{{ data.author.displayName }}</h3>
          <p :lang="contentLang(store.site.contentLocale)">
            {{ store.site.authorBio }}
          </p>
        </div>
      </section>
    </div>
  </PageFrame>
</template>
