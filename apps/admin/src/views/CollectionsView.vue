<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type {
  Moment,
  Photo,
  FriendLink,
  Pagination,
  Status,
} from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import AssetPicker from '../components/AssetPicker.vue';
const props = defineProps<{ kind: 'moments' | 'photos' | 'links' }>();
type Item = Moment | Photo | FriendLink;
const items = ref<Item[]>([]);
const total = ref(0);
const page = ref(1);
const error = ref('');
const dialog = ref(false);
const busy = ref(false);
const editId = ref('');
const labels = { moments: '瞬间', photos: '图库', links: '友链' };
const empty = () => ({
  content: '',
  status: 'DRAFT' as Status,
  publishedAt: null as string | null,
  title: '',
  description: '',
  url: '',
  album: '',
  name: '',
  logoUrl: null as string | null,
  group: '朋友们',
  published: false,
});
const form = reactive(empty());
async function load() {
  try {
    error.value = '';
    const d = await api<Pagination<Item>>(
      `/admin/${props.kind}?page=${page.value}&pageSize=15`,
    );
    items.value = d.items;
    total.value = d.total;
  } catch (e) {
    error.value = errorText(e);
  }
}
function edit(item?: Item) {
  Object.assign(form, empty(), item ?? {});
  editId.value = item?.id ?? '';
  dialog.value = true;
}
async function save() {
  busy.value = true;
  try {
    const body =
      props.kind === 'moments'
        ? {
            content: form.content,
            status: form.status,
            publishedAt: form.publishedAt,
          }
        : props.kind === 'photos'
          ? {
              title: form.title,
              description: form.description,
              url: form.url,
              album: form.album,
              published: form.published,
            }
          : {
              name: form.name,
              url: form.url,
              description: form.description,
              logoUrl: form.logoUrl,
              group: form.group,
              published: form.published,
            };
    await api(`/admin/${props.kind}${editId.value ? '/' + editId.value : ''}`, {
      method: editId.value ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    dialog.value = false;
    await load();
  } catch (e) {
    ElMessage.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
function title(item: Item) {
  return 'content' in item
    ? item.content.slice(0, 100)
    : 'title' in item
      ? item.title
      : item.name;
}
function published(item: Item) {
  return 'status' in item ? item.status === 'PUBLISHED' : item.published;
}
async function remove(item: Item) {
  try {
    await ElMessageBox.confirm('此操作无法撤销，确定删除？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  try {
    await api(`/admin/${props.kind}/${item.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    ElMessage.error(errorText(e));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="labels[kind]"
    :description="
      kind === 'moments'
        ? '短短几句，留住生活的碎片。'
        : kind === 'photos'
          ? '把喜欢的画面，放进你的相册。'
          : '那些值得一起分享的小小世界。'
    "
    ><el-button type="primary" @click="edit()"
      >＋ 新建{{ labels[kind] }}</el-button
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-table :data="items" empty-text="还没有内容"
      ><el-table-column label="内容" min-width="240"
        ><template #default="{ row }">{{
          title(row as Item)
        }}</template></el-table-column
      ><el-table-column label="状态" width="110"
        ><template #default="{ row }"
          ><el-tag :type="published(row as Item) ? 'success' : 'info'">{{
            published(row as Item) ? '已公开' : '未公开'
          }}</el-tag></template
        ></el-table-column
      ><el-table-column label="操作" width="150"
        ><template #default="{ row }"
          ><el-button text @click="edit(row as Item)">编辑</el-button
          ><el-button text type="danger" @click="remove(row as Item)"
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
  <el-dialog
    v-model="dialog"
    :title="(editId ? '编辑' : '新建') + labels[kind]"
    width="min(850px,94vw)"
    :close-on-click-modal="false"
    ><el-form label-position="top" @submit.prevent="save"
      ><template v-if="kind === 'moments'"
        ><MarkdownEditor v-model="form.content" /><el-form-item label="状态"
          ><el-select v-model="form.status"
            ><el-option label="草稿" value="DRAFT" /><el-option
              label="发布"
              value="PUBLISHED" /><el-option
              label="归档"
              value="ARCHIVED" /></el-select></el-form-item
        ><el-form-item label="发布时间"
          ><el-date-picker
            v-model="form.publishedAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            placeholder="发布时自动填入" /></el-form-item></template
      ><template v-else-if="kind === 'photos'"
        ><el-form-item label="标题"
          ><el-input
            v-model="form.title"
            maxlength="200"
            required /></el-form-item
        ><el-form-item label="图片"
          ><AssetPicker
            :model-value="form.url"
            @update:model-value="form.url = $event ?? ''" /></el-form-item
        ><el-form-item label="相册"
          ><el-input
            v-model="form.album"
            maxlength="100" /></el-form-item></template
      ><template v-else
        ><el-form-item label="名称"
          ><el-input
            v-model="form.name"
            maxlength="100"
            required /></el-form-item
        ><el-form-item label="网址"
          ><el-input
            v-model="form.url"
            type="url"
            placeholder="https://"
            required /></el-form-item
        ><el-form-item label="分组"
          ><el-input v-model="form.group" maxlength="100" /></el-form-item
        ><el-form-item label="头像"
          ><AssetPicker v-model="form.logoUrl" /></el-form-item></template
      ><template v-if="kind !== 'moments'"
        ><el-form-item label="描述"
          ><el-input
            v-model="form.description"
            type="textarea"
            maxlength="500" /></el-form-item
        ><el-form-item label="公开展示"
          ><el-switch v-model="form.published" /></el-form-item></template
      ><el-button type="primary" native-type="submit" :loading="busy"
        >保存</el-button
      ></el-form
    ></el-dialog
  >
</template>
