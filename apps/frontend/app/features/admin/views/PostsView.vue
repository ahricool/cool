<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type { Post, Page, Pagination } from '@cms/content';
import { formatDate } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const props = withDefaults(defineProps<{ kind?: 'posts' | 'pages' }>(), {
  kind: 'posts',
});
const items = ref<(Post | Page)[]>([]);
const total = ref(0);
const page = ref(1);
const q = ref('');
const busy = ref(false);
const error = ref('');
async function load() {
  busy.value = true;
  error.value = '';
  try {
    const d = await api<Pagination<Post | Page>>(
      `/admin/${props.kind}?page=${page.value}&pageSize=15${q.value ? '&q=' + encodeURIComponent(q.value) : ''}`,
    );
    items.value = d.items;
    total.value = d.total;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
async function remove(item: Post | Page) {
  try {
    await ElMessageBox.confirm(
      `永久删除「${item.title}」？此操作无法撤销。`,
      '删除内容',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  try {
    await api(`/admin/${props.kind}/${item.id}`, { method: 'DELETE' });
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error(errorText(e));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="kind === 'posts' ? '文章' : '独立页面'"
    :description="
      kind === 'posts'
        ? '每一篇文字，都是与你的读者的一次相遇。'
        : '关于、介绍与其它长期保留的内容。'
    "
    ><RouterLink :to="`/admin/${kind}/new`"
      ><el-button type="primary"
        >＋ {{ kind === 'posts' ? '写文章' : '新建页面' }}</el-button
      ></RouterLink
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <form
      class="table-toolbar"
      @submit.prevent="
        page = 1;
        load();
      "
    >
      <el-input
        v-model="q"
        placeholder="搜索标题…"
        clearable
        aria-label="搜索标题"
      /><el-button native-type="submit">搜索</el-button
      ><span class="muted">共 {{ total }} 篇</span>
    </form>
    <el-table
      v-loading="busy"
      :data="items"
      empty-text="暂无内容，开始写下第一篇吧"
      ><el-table-column label="标题" min-width="260"
        ><template #default="{ row }"
          ><RouterLink :to="`/admin/${kind}/${row.id}`" class="table-title">{{
            row.title
          }}</RouterLink
          ><small class="table-slug"
            >/{{ kind }}/{{ row.slug }}</small
          ></template
        ></el-table-column
      ><el-table-column label="状态" width="120"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'">{{
            row.status === 'PUBLISHED'
              ? new Date(row.publishedAt) > new Date()
                ? '定时发布'
                : '已发布'
              : row.status === 'ARCHIVED'
                ? '已归档'
                : '草稿'
          }}</el-tag></template
        ></el-table-column
      ><el-table-column label="更新于" width="130"
        ><template #default="{ row }">{{
          formatDate(row.updatedAt)
        }}</template></el-table-column
      ><el-table-column label="操作" width="150"
        ><template #default="{ row }"
          ><RouterLink :to="`/admin/${kind}/${row.id}`"
            ><el-button text type="primary">编辑</el-button></RouterLink
          ><el-button text type="danger" @click="remove(row as Post | Page)"
            >删除</el-button
          ></template
        ></el-table-column
      ></el-table
    ><el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="15"
      layout="prev,pager,next"
      @current-change="load"
    />
  </section>
</template>
