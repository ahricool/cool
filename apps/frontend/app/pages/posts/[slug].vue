<script setup lang="ts">
import { renderMarkdown, formatDate, type Post } from '@cms/content';
const route = useRoute();
const store = useSiteStore();
const api = useApi();
const slug = computed(() => String(route.params.slug));
const { data, pending, error, refresh } = await useAsyncData(
  () => `post-${slug.value}`,
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
    :title="data?.title ?? '文章'"
    content-class="post"
    ><template #header
      ><div class="post-header">
        <PageHeader :title="data?.title ?? '文章'" :cover="data?.coverUrl"
          ><div v-if="data" class="post-meta">
            <div class="meta-container">
              <span class="post-meta-item"
                ><span
                  >{{ data.author.displayName }} ·
                  {{ formatDate(data.publishedAt) }} ·
                  {{ data.commentCount }} 条评论</span
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
        aria-label="文章目录"
      >
        <details open>
          <summary>文章目录</summary>
          <a
            v-for="heading in rendered.toc"
            :key="heading.id"
            :href="`#${heading.id}`"
            :style="{ paddingLeft: `${(heading.level - 1) * 10}px` }"
            >{{ heading.text }}</a
          >
        </details>
      </aside>
      <article :id="`post-${data.id}`" class="post-article">
        <div
          class="entry-content fancybox-content"
          v-html="rendered.html"
        ></div>
        <footer class="post-footer">
          <div><p class="flex-child-center">Q.E.D. ❀</p></div>
          <div class="post-footer-meta">
            <div class="post-tags flex-child-center">
              <NuxtLink
                v-for="tag in data.tags"
                :key="tag.tag.id"
                :to="{ path: '/tags', query: { tag: tag.tag.slug } }"
                >#{{ tag.tag.name }}</NuxtLink
              >
            </div>
            <button @click="share">
              {{ copied ? '链接已复制' : '分享 · 复制链接' }}
            </button>
          </div>
        </footer>
      </article>
      <section class="author-profile">
        <img
          :src="
            data.author.avatarUrl ||
            store.site.avatarUrl ||
            '/sakura/images/default/avatar.webp'
          "
          :alt="data.author.displayName"
          width="80"
          height="80"
        />
        <div>
          <h3>{{ data.author.displayName }}</h3>
          <p>{{ store.site.authorBio }}</p>
        </div>
      </section>
      <Comments :slug="slug" :enabled="store.site.commentsEnabled" />
    </div>
  </PageFrame>
</template>
