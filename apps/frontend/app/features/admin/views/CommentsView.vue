<script setup lang="ts">
const { t, formatDate, contentLang, locale } = useCmsI18n();
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type { Comment, Pagination } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import { publicUrl } from '../publicUrl';
import { displayTranslation } from '../content';
const postTranslation = (item: Comment) =>
  item.post ? displayTranslation(item.post, locale.value) : undefined;
const items = ref<Comment[]>([]);
const total = ref(0);
const page = ref(1);
const error = ref('');
async function load() {
  try {
    error.value = '';
    const d = await api<Pagination<Comment>>(
      `/admin/comments?page=${page.value}&pageSize=15`,
    );
    items.value = d.items;
    total.value = d.total;
  } catch (e) {
    error.value = errorText(e);
  }
}
async function moderate(item: Comment, status: string) {
  try {
    await api(`/admin/comments/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  }
}
async function remove(item: Comment) {
  try {
    await ElMessageBox.confirm(t('永久删除这条评论？'), t('删除评论'), {
      confirmButtonText: t('删除'),
      cancelButtonText: t('取消'),
    });
  } catch {
    return;
  }
  try {
    await api(`/admin/comments/${item.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="t('评论')"
    :description="t('交流让文字有回响。审核通过的评论才会公开显示。')"
  /><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-empty v-if="!items.length && !error" :description="t('暂时没有评论')" />
    <article v-for="item in items" :key="item.id" class="moderation-card">
      <header>
        <strong>{{ item.name }}</strong
        ><small>{{ formatDate(item.createdAt) }}</small
        ><el-tag
          :type="
            item.status === 'APPROVED'
              ? 'success'
              : item.status === 'SPAM'
                ? 'danger'
                : 'warning'
          "
          >{{
            item.status === 'APPROVED'
              ? t('已通过')
              : item.status === 'SPAM'
                ? t('垃圾评论')
                : t('待审核')
          }}</el-tag
        >
      </header>
      <p>{{ item.content }}</p>
      <footer>
        <a
          :href="publicUrl(`/posts/${item.post?.slug}`)"
          :lang="contentLang(postTranslation(item)?.locale)"
          target="_blank"
          rel="noopener"
          >{{ postTranslation(item)?.title }} ↗</a
        >
        <div>
          <el-button
            v-if="item.status !== 'APPROVED'"
            text
            type="success"
            @click="moderate(item, 'APPROVED')"
            >{{ t('通过') }}</el-button
          ><el-button
            v-if="item.status === 'APPROVED'"
            text
            @click="moderate(item, 'PENDING')"
            >{{ t('撤回') }}</el-button
          ><el-button text type="warning" @click="moderate(item, 'SPAM')">{{
            t('标为垃圾')
          }}</el-button
          ><el-button text type="danger" @click="remove(item)">{{
            t('删除')
          }}</el-button>
        </div>
      </footer>
    </article>
    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="15"
      layout="prev,pager,next"
      @current-change="load"
    />
  </section>
</template>
