<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, session, errorText } from '../api';
import type { Post, Pagination } from '@cms/content';
import { formatDate } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const counts = ref({ posts: 0, drafts: 0, media: 0, comments: 0 });
const posts = ref<Post[]>([]);
const error = ref('');
async function load() {
  try {
    error.value = '';
    const [c, p] = await Promise.all([
      api<typeof counts.value>('/admin/overview'),
      api<Pagination<Post>>('/admin/posts?pageSize=5'),
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
    :title="`${session.owner?.displayName ?? '站长'}，你好。`"
    description="属于你的创作空间，今天也有值得记录的事。"
    ><RouterLink to="/posts/new"
      ><el-button type="primary">＋ 写文章</el-button></RouterLink
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="welcome-card">
    <div>
      <p class="eyebrow">MAKE ROOM FOR YOUR IDEAS</p>
      <h2>从一个念头，<br />到一篇好文章。</h2>
      <p>让文字留住此刻，让分享连接彼此。</p>
      <RouterLink to="/posts/new">开始创作 →</RouterLink>
    </div>
    <div class="welcome-flower" aria-hidden="true">❀</div>
  </section>
  <div class="stat-grid">
    <RouterLink
      v-for="stat in [
        { label: '全部文章', value: counts.posts, path: '/posts' },
        { label: '待完成草稿', value: counts.drafts, path: '/posts' },
        { label: '媒体资源', value: counts.media, path: '/media' },
        { label: '待审核评论', value: counts.comments, path: '/comments' },
      ]"
      :key="stat.label"
      :to="stat.path"
      class="stat-card"
      ><span>{{ stat.label }}</span
      ><strong>{{ stat.value }}</strong
      ><small>查看详情 ↗</small></RouterLink
    >
  </div>
  <section class="panel">
    <header class="panel-heading">
      <h2>最近的文章</h2>
      <RouterLink to="/posts">全部文章 →</RouterLink>
    </header>
    <el-empty
      v-if="!posts.length && !error"
      description="第一篇故事，从这里开始"
    />
    <div v-for="post in posts" :key="post.id" class="recent-row">
      <div>
        <RouterLink :to="`/posts/${post.id}`">{{ post.title }}</RouterLink
        ><small>{{ formatDate(post.updatedAt) }}</small>
      </div>
      <el-tag :type="post.status === 'PUBLISHED' ? 'success' : 'info'">{{
        post.status === 'PUBLISHED'
          ? '已发布'
          : post.status === 'ARCHIVED'
            ? '已归档'
            : '草稿'
      }}</el-tag>
    </div>
  </section>
</template>
