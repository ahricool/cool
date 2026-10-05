<script setup lang="ts">
import { useCoolI18n } from '~/composables/useCoolI18n';
import { computed, onMounted, ref } from 'vue';
import { api, session, errorText } from '../api';
import type { AdminPost, Pagination } from '@cool/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const { t, locale, formatDate } = useCoolI18n();
const counts = ref({ posts: 0, drafts: 0, media: 0 });
const posts = ref<AdminPost[]>([]);
const error = ref('');
const recentPosts = computed(() =>
  posts.value.map((post) => ({
    ...post,
    translation:
      post.translations.find((entry) => entry.locale === locale.value) ??
      post.translations[0],
  })),
);
async function load() {
  try {
    error.value = '';
    const [c, p] = await Promise.all([
      api<typeof counts.value>('/admin/overview'),
      api<Pagination<AdminPost>>('/admin/posts?pageSize=5'),
    ]);
    counts.value = c;
    posts.value = p.items;
  } catch (e) {
    error.value = errorText(e);
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="
      t('{name}，你好。', { name: session.owner?.displayName ?? t('站长') })
    "
    ><RouterLink to="/admin/posts/new"
      ><el-button type="primary">{{ t('＋ 新建内容') }}</el-button></RouterLink
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <div class="stat-grid">
    <RouterLink
      v-for="stat in [
        { label: '全部内容', value: counts.posts, path: '/admin/posts' },
        { label: '待完成草稿', value: counts.drafts, path: '/admin/posts' },
        { label: '媒体资源', value: counts.media, path: '/admin/photos' },
      ]"
      :key="stat.label"
      :to="stat.path"
      class="stat-card"
      ><span>{{ t(stat.label) }}</span
      ><strong>{{ stat.value }}</strong
      ><small>{{ t('查看详情 ↗') }}</small
      ><SakuraFlower class="stat-flower"
    /></RouterLink>
  </div>
  <section class="panel">
    <header class="panel-heading">
      <h2>{{ t('最近的内容') }}</h2>
      <RouterLink to="/admin/posts">{{ t('全部内容 →') }}</RouterLink>
    </header>
    <el-empty
      v-if="!posts.length && !error"
      :description="t('第一篇故事，从这里开始')"
    />
    <div v-for="post in recentPosts" :key="post.id" class="recent-row">
      <div>
        <RouterLink
          :to="`/admin/posts/${post.id}`"
          :lang="post.translation?.locale === 'zh' ? 'zh-CN' : 'en'"
          >{{ post.translation?.title || t('未命名内容') }}</RouterLink
        ><small>{{
          formatDate(post.translation?.updatedAt ?? post.updatedAt)
        }}</small>
      </div>
      <el-tag
        :type="post.translation?.status === 'PUBLISHED' ? 'success' : 'info'"
        >{{
          t(
            post.translation?.status === 'PUBLISHED'
              ? '已发布'
              : post.translation?.status === 'ARCHIVED'
                ? '已归档'
                : '草稿',
          )
        }}</el-tag
      >
    </div>
  </section>
</template>
