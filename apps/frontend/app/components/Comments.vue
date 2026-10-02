<script setup lang="ts">
import type { Pagination, Comment } from '@cms/content';
import { formatDate } from '@cms/content';
const props = defineProps<{ slug: string; enabled: boolean }>();
const api = useApi();
const page = ref(1);
const name = ref('');
const content = ref('');
const website = ref('');
const busy = ref(false);
const message = ref('');
const failure = ref('');
const { data, error, refresh } = await useAsyncData(
  () => `comments-${props.slug}-${page.value}`,
  () =>
    api<Pagination<Comment>>(`/public/posts/${props.slug}/comments`, {
      query: { page: page.value, pageSize: 10 },
    }),
);
async function submit() {
  busy.value = true;
  failure.value = '';
  message.value = '';
  try {
    const r = await api<{ message: string }>(
      `/public/posts/${props.slug}/comments`,
      {
        method: 'POST',
        body: {
          name: name.value,
          content: content.value,
          website: website.value,
        },
      },
    );
    content.value = '';
    message.value = r.message;
  } catch {
    failure.value = '提交失败，请稍后再试。短时间内最多提交 3 条评论。';
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="comments-area">
    <h2>
      评论 <small>{{ data?.total ?? 0 }}</small>
    </h2>
    <ApiState :error="error" @retry="refresh()" />
    <ol class="comment-list">
      <li v-for="comment in data?.items" :key="comment.id">
        <div>
          <strong>{{ comment.name }}</strong
          ><time>{{ formatDate(comment.createdAt) }}</time>
        </div>
        <p>{{ comment.content }}</p>
      </li>
    </ol>
    <div v-if="data && data.total > 10" class="pagination">
      <button :disabled="page === 1" @click="page--">上一页</button
      ><span>{{ page }}</span
      ><button :disabled="page * 10 >= data.total" @click="page++">
        下一页
      </button>
    </div>
    <form v-if="enabled" class="comment-form" @submit.prevent="submit">
      <h3>留下你的足迹</h3>
      <label
        >昵称<input
          v-model="name"
          required
          maxlength="80"
          autocomplete="nickname" /></label
      ><label
        >评论<textarea
          v-model="content"
          required
          rows="4"
          maxlength="3000"
        ></textarea></label
      ><label class="honeypot" aria-hidden="true"
        >网站<input v-model="website" tabindex="-1" autocomplete="off"
      /></label>
      <p class="form-hint">评论审核后显示，请友善交流。</p>
      <button :disabled="busy">{{ busy ? '提交中…' : '提交评论' }}</button>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="failure" role="alert">{{ failure }}</p>
    </form>
    <p v-else>评论已关闭。</p>
  </section>
</template>
