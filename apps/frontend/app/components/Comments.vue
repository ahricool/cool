<script setup lang="ts">
const { t, locale, formatDate } = useCmsI18n();
import type { Pagination, Comment } from '@cms/content';
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
  () => `comments-${locale.value}-${props.slug}-${page.value}`,
  () =>
    api<Pagination<Comment>>(
      `/public/posts/${encodeURIComponent(props.slug)}/comments`,
      {
        query: { page: page.value, pageSize: 10 },
      },
    ),
);
async function submit() {
  if (busy.value) return;
  message.value = '';
  failure.value = !name.value.trim()
    ? '请输入昵称。'
    : !content.value.trim()
      ? '请输入评论内容。'
      : '';
  if (failure.value) return;
  busy.value = true;
  try {
    await api<{ message: string }>(
      `/public/posts/${encodeURIComponent(props.slug)}/comments`,
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
    message.value = '评论已提交，审核后显示。';
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
      {{ t('评论') }} <small>{{ data?.total ?? 0 }}</small>
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
      <button :disabled="page === 1" @click="page--">{{ t('上一页') }}</button
      ><span>{{ page }}</span
      ><button :disabled="page * 10 >= data.total" @click="page++">
        {{ t('下一页') }}
      </button>
    </div>
    <form
      v-if="enabled"
      class="comment-form"
      novalidate
      @submit.prevent="submit"
    >
      <h3>{{ t('留下你的足迹') }}</h3>
      <label
        >{{ t('昵称')
        }}<input
          v-model="name"
          :aria-invalid="failure === '请输入昵称。'"
          :aria-describedby="
            failure === '请输入昵称。' ? 'comment-form-error' : undefined
          "
          required
          maxlength="80"
          autocomplete="nickname" /></label
      ><label
        >{{ t('评论')
        }}<textarea
          v-model="content"
          :aria-invalid="failure === '请输入评论内容。'"
          :aria-describedby="
            failure === '请输入评论内容。' ? 'comment-form-error' : undefined
          "
          required
          rows="4"
          maxlength="3000"
        ></textarea></label
      ><label class="honeypot" aria-hidden="true"
        >{{ t('网站')
        }}<input v-model="website" tabindex="-1" autocomplete="off"
      /></label>
      <p class="form-hint">{{ t('评论审核后显示，请友善交流。') }}</p>
      <button :disabled="busy">{{ t(busy ? '提交中…' : '提交评论') }}</button>
      <p v-if="message" role="status">{{ t(message) }}</p>
      <p v-if="failure" id="comment-form-error" role="alert">
        {{ t(failure) }}
      </p>
    </form>
    <p v-else>{{ t('评论已关闭。') }}</p>
  </section>
</template>
