<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type { AdminTaxonomy } from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import { displayTranslation } from '../content';
import type { CmsLocale } from '~/i18n/locale';
const { t, locale, contentLang } = useCmsI18n();
const contentLocale = ref<CmsLocale>(locale.value);
const names = reactive({ zh: '', en: '' });
const props = defineProps<{ kind: 'categories' | 'tags' }>();
const items = ref<AdminTaxonomy[]>([]);
const error = ref('');
const dialog = ref(false);
const busy = ref(false);
const editId = ref('');
const form = reactive({ slug: '' });
async function load() {
  try {
    error.value = '';
    items.value = await api(`/admin/${props.kind}`);
  } catch (e) {
    error.value = errorText(e);
  }
}
function edit(item?: AdminTaxonomy) {
  editId.value = item?.id ?? '';
  form.slug = item?.slug ?? '';
  names.zh =
    item?.translations.find((item) => item.locale === 'zh')?.name ?? '';
  names.en =
    item?.translations.find((item) => item.locale === 'en')?.name ?? '';
  dialog.value = true;
}
async function save() {
  if (busy.value) return;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    ElMessage.warning(t('请填写有效的 URL 标识'));
    return;
  }
  if (!names.zh.trim() && !names.en.trim()) {
    ElMessage.warning(t('请至少填写一种语言的内容'));
    return;
  }
  busy.value = true;
  try {
    await api(`/admin/${props.kind}${editId.value ? '/' + editId.value : ''}`, {
      method: editId.value ? 'PUT' : 'POST',
      body: JSON.stringify({
        slug: form.slug,
        translations: (['zh', 'en'] as const)
          .filter((locale) => names[locale].trim())
          .map((locale) => ({ locale, name: names[locale] })),
      }),
    });
    dialog.value = false;
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  } finally {
    busy.value = false;
  }
}
async function remove(item: AdminTaxonomy) {
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
    await api(`/admin/${props.kind}/${item.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  }
}
onMounted(load);
</script>
<template>
  <ViewHeader
    :title="kind === 'categories' ? t('分类') : t('标签')"
    :description="t('给每一份内容，找到合适的位置。')"
    ><el-button type="primary" @click="edit()">{{
      t('＋ 新建')
    }}</el-button></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-table :data="items" :empty-text="t('还没有创建任何条目')"
      ><el-table-column :label="t('名称')"
        ><template #default="{ row }"
          ><span
            :lang="
              contentLang(displayTranslation(row as AdminTaxonomy)?.locale)
            "
            >{{
              displayTranslation(row as AdminTaxonomy)?.name ?? row.slug
            }}</span
          ></template
        ></el-table-column
      ><el-table-column prop="slug" :label="t('URL 标识')" /><el-table-column
        :label="t('操作')"
        width="160"
        ><template #default="{ row }"
          ><el-button text type="primary" @click="edit(row as AdminTaxonomy)">{{
            t('编辑')
          }}</el-button
          ><el-button
            text
            type="danger"
            @click="remove(row as AdminTaxonomy)"
            >{{ t('删除') }}</el-button
          ></template
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
      ><el-form-item :label="t('URL 标识')"
        ><el-input
          v-model="form.slug"
          required
          :placeholder="t('小写字母、数字、连字符')"
          maxlength="160" /></el-form-item
      ><el-button native-type="submit" type="primary" :loading="busy">{{
        t('保存')
      }}</el-button></el-form
    ></el-dialog
  >
</template>
