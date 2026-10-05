<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { toast } from '~/utils/toast';
import { api, errorText } from '../api';
import type { AdminTag } from '@cool/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import { displayTranslation } from '../content';
import type { CoolLocale } from '~/i18n/locale';
const { t, locale, contentLang } = useCoolI18n();
const contentLocale = ref<CoolLocale>(locale.value);
const names = reactive({ zh: '', en: '' });

const items = ref<AdminTag[]>([]);
const error = ref('');
const dialog = ref(false);
const busy = ref(false);
const editId = ref('');
async function load() {
  try {
    error.value = '';
    items.value = await api(`/admin/tags`);
  } catch (e) {
    error.value = errorText(e);
  }
}
function edit(item?: AdminTag) {
  editId.value = item?.id ?? '';
  names.zh =
    item?.translations.find((item) => item.locale === 'zh')?.name ?? '';
  names.en =
    item?.translations.find((item) => item.locale === 'en')?.name ?? '';
  dialog.value = true;
}
async function save() {
  if (busy.value) return;
  if (!names.zh.trim() && !names.en.trim()) {
    toast.warning(t('请至少填写一种语言的内容'));
    return;
  }
  busy.value = true;
  try {
    await api(`/admin/tags${editId.value ? '/' + editId.value : ''}`, {
      method: editId.value ? 'PUT' : 'POST',
      body: JSON.stringify({
        translations: (['zh', 'en'] as const)
          .filter((locale) => names[locale].trim())
          .map((locale) => ({ locale, name: names[locale] })),
      }),
    });
    dialog.value = false;
    await load();
  } catch (e) {
    toast.error(t(errorText(e)));
  } finally {
    busy.value = false;
  }
}
async function remove(item: AdminTag) {
  try {
    await ElMessageBox.confirm(
      t('删除后会解除文章关联，文章内容会保留。'),
      t('删除确认'),
      { confirmButtonText: t('删除'), cancelButtonText: t('取消') },
    );
  } catch {
    return;
  }
  try {
    await api(`/admin/tags/${item.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    toast.error(t(errorText(e)));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader :title="t('标签')"
    ><el-button type="primary" @click="edit()">{{
      t('＋ 新建')
    }}</el-button></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-table :data="items" :empty-text="t('还没有创建任何条目')"
      ><el-table-column :label="t('名称')"
        ><template #default="{ row }"
          ><span
            :lang="contentLang(displayTranslation(row as AdminTag)?.locale)"
            >{{ displayTranslation(row as AdminTag)?.name ?? row.slug }}</span
          ></template
        ></el-table-column
      ><el-table-column prop="slug" :label="t('链接名称')" /><el-table-column
        :label="t('操作')"
        width="160"
        class-name="table-actions-cell"
        ><template #default="{ row }"
          ><el-button text type="primary" @click="edit(row as AdminTag)">{{
            t('编辑')
          }}</el-button
          ><el-button text type="danger" @click="remove(row as AdminTag)">{{
            t('删除')
          }}</el-button></template
        ></el-table-column
      ></el-table
    >
  </section>
  <el-dialog
    v-model="dialog"
    :title="editId ? t('编辑') : t('新建')"
    width="min(460px,92vw)"
    ><div
      class="content-language-tabs"
      role="group"
      :aria-label="t('内容语言')"
    >
      <button
        type="button"
        :aria-pressed="contentLocale === 'zh'"
        @click="contentLocale = 'zh'"
      >
        简体中文</button
      ><button
        type="button"
        :aria-pressed="contentLocale === 'en'"
        @click="contentLocale = 'en'"
      >
        English
      </button>
    </div>
    <el-form novalidate label-position="top" @submit.prevent="save"
      ><el-form-item :label="t('名称')"
        ><el-input
          v-model="names[contentLocale]"
          :lang="contentLang(contentLocale)"
          maxlength="100" /></el-form-item
      ><el-button native-type="submit" type="primary" :loading="busy">{{
        t('保存')
      }}</el-button></el-form
    ></el-dialog
  >
</template>
