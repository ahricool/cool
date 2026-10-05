<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { toast } from '~/utils/toast';
import { api, errorText } from '../api';
import type { AdminPost, AdminPage, Pagination } from '@cool/content';
import { displayTranslation } from '../content';
const { t, formatDate, contentLang } = useCoolI18n();
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const props = withDefaults(defineProps<{ kind?: 'posts' | 'pages' }>(), {
  kind: 'posts',
});
const items = ref<(AdminPost | AdminPage)[]>([]);
const total = ref(0);
const page = ref(1);
const q = ref('');
const busy = ref(false);
const error = ref('');
async function load() {
  busy.value = true;
  error.value = '';
  try {
    const d = await api<Pagination<AdminPost | AdminPage>>(
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
async function remove(item: AdminPost | AdminPage) {
  try {
    await ElMessageBox.confirm(
      t('永久删除「{title}」？此操作无法撤销。', {
        title: displayTranslation(item)?.title ?? item.slug,
      }),
      t('删除内容'),
      {
        type: 'warning',
        confirmButtonText: t('删除'),
        cancelButtonText: t('取消'),
      },
    );
  } catch {
    return;
  }
  try {
    await api(`/admin/${props.kind}/${item.id}`, { method: 'DELETE' });
    toast.success(t('已删除'));
    await load();
  } catch (e) {
    toast.error(t(errorText(e)));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="kind === 'posts' ? t('内容') : t('独立页面')"
    :description="
      kind === 'pages' ? t('关于、介绍与其它长期保留的内容。') : undefined
    "
    ><RouterLink :to="`/admin/${kind}/new`"
      ><el-button type="primary"
        >＋ {{ kind === 'posts' ? t('新建内容') : t('新建页面') }}</el-button
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
        :placeholder="t('搜索标题…')"
        clearable
        :aria-label="t('搜索标题')"
      /><el-button native-type="submit">{{ t('搜索') }}</el-button
      ><span class="muted">{{ t('共 {count} 篇', { count: total }) }}</span>
    </form>
    <el-table
      v-loading="busy"
      :data="items"
      :empty-text="t('暂无内容，开始写下第一篇吧')"
      ><el-table-column :label="t('标题')" min-width="260"
        ><template #default="{ row }"
          ><RouterLink
            :to="`/admin/${kind}/${row.id}`"
            :lang="
              contentLang(
                displayTranslation(row as AdminPost | AdminPage)?.locale,
              )
            "
            class="table-title"
            >{{
              displayTranslation(row as AdminPost | AdminPage)?.title ||
              row.slug
            }}</RouterLink
          ><small class="table-slug"
            >/{{ kind }}/{{ row.slug }}</small
          ></template
        ></el-table-column
      ><el-table-column v-if="kind === 'posts'" :label="t('类型')" width="100"
        ><template #default="{ row }">{{
          row.type === 'MOMENT' ? t('瞬间') : t('文章')
        }}</template></el-table-column
      ><el-table-column :label="t('状态')" min-width="180"
        ><template #default="{ row }"
          ><div
            v-for="translation in row.translations"
            :key="translation.locale"
            class="translation-status"
          >
            <el-tag
              :type="translation.status === 'PUBLISHED' ? 'success' : 'info'"
            >
              {{ translation.locale === 'zh' ? t('中文') : 'EN' }} ·
              {{
                translation.status === 'PUBLISHED'
                  ? new Date(translation.publishedAt) > new Date()
                    ? t('定时发布')
                    : t('已发布')
                  : translation.status === 'ARCHIVED'
                    ? t('已归档')
                    : t('草稿')
              }}
            </el-tag>
          </div></template
        ></el-table-column
      ><el-table-column :label="t('更新于')" width="130"
        ><template #default="{ row }">{{
          formatDate(row.updatedAt)
        }}</template></el-table-column
      ><el-table-column
        :label="t('操作')"
        width="150"
        class-name="table-actions-cell"
        ><template #default="{ row }"
          ><RouterLink class="table-action" :to="`/admin/${kind}/${row.id}`">{{
            t('编辑')
          }}</RouterLink
          ><el-button
            text
            type="danger"
            @click="remove(row as AdminPost | AdminPage)"
            >{{ t('删除') }}</el-button
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
