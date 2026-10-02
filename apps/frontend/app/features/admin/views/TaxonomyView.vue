<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type { Taxonomy } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
const props = defineProps<{ kind: 'categories' | 'tags' }>();
const items = ref<Taxonomy[]>([]);
const error = ref('');
const dialog = ref(false);
const busy = ref(false);
const editId = ref('');
const form = reactive({ name: '', slug: '' });
async function load() {
  try {
    error.value = '';
    items.value = await api(`/admin/${props.kind}`);
  } catch (e) {
    error.value = errorText(e);
  }
}
function edit(item?: Taxonomy) {
  editId.value = item?.id ?? '';
  Object.assign(form, { name: item?.name ?? '', slug: item?.slug ?? '' });
  dialog.value = true;
}
async function save() {
  busy.value = true;
  try {
    await api(`/admin/${props.kind}${editId.value ? '/' + editId.value : ''}`, {
      method: editId.value ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    dialog.value = false;
    await load();
  } catch (e) {
    ElMessage.error(errorText(e));
  } finally {
    busy.value = false;
  }
}
async function remove(item: Taxonomy) {
  try {
    await ElMessageBox.confirm(
      '删除后会解除文章关联，文章内容会保留。',
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消' },
    );
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
    :title="kind === 'categories' ? '分类' : '标签'"
    description="给每一份内容，找到合适的位置。"
    ><el-button type="primary" @click="edit()">＋ 新建</el-button></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-table :data="items" empty-text="还没有创建任何条目"
      ><el-table-column prop="name" label="名称" /><el-table-column
        prop="slug"
        label="URL 标识"
      /><el-table-column label="操作" width="160"
        ><template #default="{ row }"
          ><el-button text type="primary" @click="edit(row as Taxonomy)"
            >编辑</el-button
          ><el-button text type="danger" @click="remove(row as Taxonomy)"
            >删除</el-button
          ></template
        ></el-table-column
      ></el-table
    >
  </section>
  <el-dialog
    v-model="dialog"
    :title="editId ? '编辑' : '新建'"
    width="min(460px,92vw)"
    ><el-form label-position="top" @submit.prevent="save"
      ><el-form-item label="名称"
        ><el-input v-model="form.name" required maxlength="100" /></el-form-item
      ><el-form-item label="URL 标识"
        ><el-input
          v-model="form.slug"
          required
          placeholder="小写字母、数字、连字符"
          maxlength="160" /></el-form-item
      ><el-button native-type="submit" type="primary" :loading="busy"
        >保存</el-button
      ></el-form
    ></el-dialog
  >
</template>
