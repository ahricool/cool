<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, errorText } from '../api';
import type {
  AdminMoment,
  AdminPhoto,
  AdminFriendLink,
  Pagination,
  Status,
} from '@cms/content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import AssetPicker from '../components/AssetPicker.vue';
import { displayTranslation } from '../content';
import type { CmsLocale } from '~/i18n/locale';
const { t, locale, contentLang } = useCmsI18n();
const contentLocale = ref<CmsLocale>(locale.value);
const props = defineProps<{ kind: 'moments' | 'photos' | 'links' }>();
type Item = AdminMoment | AdminPhoto | AdminFriendLink;
const items = ref<Item[]>([]);
const total = ref(0);
const page = ref(1);
const error = ref('');
const dialog = ref(false);
const busy = ref(false);
const uploads = reactive({ content: false, asset: false });
const uploading = computed(() => uploads.content || uploads.asset);
function beforeClose(done: () => void) {
  if (!busy.value && !uploading.value) done();
}
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
  group: '',
  published: false,
});
const form = reactive({
  url: '',
  logoUrl: null as string | null,
  published: false,
});
const translated = reactive({ zh: empty(), en: empty() });
const translation = computed(() => translated[contentLocale.value]);
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
  if (busy.value || uploading.value) return;
  Object.assign(form, { url: '', logoUrl: null, published: false }, item ?? {});
  for (const language of ['zh', 'en'] as const)
    Object.assign(
      translated[language],
      empty(),
      item?.translations.find((value) => value.locale === language) ?? {},
    );
  editId.value = item?.id ?? '';
  dialog.value = true;
}
async function save() {
  if (busy.value || uploading.value) return;
  for (const language of ['zh', 'en'] as const) {
    const value = translated[language];
    const incomplete =
      props.kind === 'photos'
        ? !value.title.trim() &&
          !!(value.description.trim() || value.album.trim())
        : props.kind === 'links' &&
          !value.name.trim() &&
          !!(value.description.trim() || value.group.trim());
    if (incomplete) {
      contentLocale.value = language;
      ElMessage.warning(t('请为已填写的语言补充标题或名称'));
      return;
    }
  }
  if (props.kind !== 'moments' && !form.url.trim()) {
    ElMessage.warning(t('请填写图片或链接地址'));
    return;
  }
  if (props.kind === 'links') {
    try {
      const url = new URL(form.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      ElMessage.warning(t('请输入有效的 HTTP 或 HTTPS 网址'));
      return;
    }
  }
  busy.value = true;
  try {
    const translations = (['zh', 'en'] as const).flatMap<
      Record<string, string | null>
    >((locale) => {
      const value = translated[locale];
      if (props.kind === 'moments')
        return value.content.trim()
          ? [
              {
                locale,
                content: value.content,
                status: value.status,
                publishedAt: value.publishedAt,
              },
            ]
          : [];
      if (props.kind === 'photos')
        return value.title.trim()
          ? [
              {
                locale,
                title: value.title,
                description: value.description,
                album: value.album,
              },
            ]
          : [];
      return value.name.trim()
        ? [
            {
              locale,
              name: value.name,
              description: value.description,
              group: value.group,
            },
          ]
        : [];
    });
    if (!translations.length) {
      ElMessage.warning(t('请至少填写一种语言的内容'));
      return;
    }
    const body = {
      translations,
      ...(props.kind === 'moments'
        ? {}
        : props.kind === 'photos'
          ? { url: form.url, published: form.published }
          : {
              url: form.url,
              logoUrl: form.logoUrl,
              published: form.published,
            }),
    };
    await api(`/admin/${props.kind}${editId.value ? '/' + editId.value : ''}`, {
      method: editId.value ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    dialog.value = false;
    await load();
  } catch (e) {
    ElMessage.error(t(errorText(e)));
  } finally {
    busy.value = false;
  }
}
function title(item: Item) {
  const value = displayTranslation(
    item as {
      translations: {
        locale: CmsLocale;
        title?: string;
        content?: string;
        name?: string;
      }[];
    },
  );
  return value?.content?.slice(0, 100) ?? value?.title ?? value?.name ?? '';
}
function published(item: Item) {
  return 'published' in item
    ? item.published
    : item.translations.some((value) => value.status === 'PUBLISHED');
}
async function remove(item: Item) {
  try {
    await ElMessageBox.confirm(t('此操作无法撤销，确定删除？'), t('删除确认'), {
      confirmButtonText: t('删除'),
      cancelButtonText: t('取消'),
    });
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
    :title="t(labels[kind])"
    :description="
      kind === 'moments'
        ? t('短短几句，留住生活的碎片。')
        : kind === 'photos'
          ? t('把喜欢的画面，放进你的相册。')
          : t('那些值得一起分享的小小世界。')
    "
    ><el-button type="primary" @click="edit()"
      >＋ {{ t('新建') }} {{ t(labels[kind]) }}</el-button
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" />
  <section class="panel">
    <el-table :data="items" :empty-text="t('还没有内容')"
      ><el-table-column :label="t('内容')" min-width="240"
        ><template #default="{ row }">{{
          title(row as Item)
        }}</template></el-table-column
      ><el-table-column :label="t('状态')" width="110"
        ><template #default="{ row }"
          ><el-tag :type="published(row as Item) ? 'success' : 'info'">{{
            published(row as Item) ? t('已公开') : t('未公开')
          }}</el-tag></template
        ></el-table-column
      ><el-table-column :label="t('操作')" width="150"
        ><template #default="{ row }"
          ><el-button text @click="edit(row as Item)">{{ t('编辑') }}</el-button
          ><el-button text type="danger" @click="remove(row as Item)">{{
            t('删除')
          }}</el-button></template
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
    :title="`${editId ? t('编辑') : t('新建')} ${t(labels[kind])}`"
    width="min(850px,94vw)"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy && !uploading"
    :show-close="!busy && !uploading"
    :before-close="beforeClose"
    ><div
      class="content-language-tabs"
      role="group"
      :aria-label="t('内容语言')"
    >
      <button
        type="button"
        :aria-pressed="contentLocale === 'zh'"
        :disabled="busy || uploading"
        @click="contentLocale = 'zh'"
      >
        简体中文</button
      ><button
        type="button"
        :aria-pressed="contentLocale === 'en'"
        :disabled="busy || uploading"
        @click="contentLocale = 'en'"
      >
        English
      </button>
    </div>
    <el-form novalidate label-position="top" @submit.prevent="save"
      ><template v-if="kind === 'moments'"
        ><MarkdownEditor
          v-model="translation.content"
          :content-locale="contentLocale"
          :disabled="busy"
          @busy-change="uploads.content = $event" /><el-form-item
          :label="t('状态')"
          ><el-select v-model="translation.status"
            ><el-option :label="t('草稿')" value="DRAFT" /><el-option
              :label="t('发布')"
              value="PUBLISHED" /><el-option
              :label="t('归档')"
              value="ARCHIVED" /></el-select></el-form-item
        ><el-form-item :label="t('发布时间')"
          ><el-date-picker
            v-model="translation.publishedAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            :placeholder="t('发布时自动填入')" /></el-form-item></template
      ><template v-else-if="kind === 'photos'"
        ><el-form-item :label="t('标题')"
          ><el-input
            v-model="translation.title"
            :lang="contentLang(contentLocale)"
            maxlength="200"
            required /></el-form-item
        ><el-form-item :label="t('图片')"
          ><AssetPicker
            :model-value="form.url"
            :disabled="busy"
            @busy-change="uploads.asset = $event"
            @update:model-value="form.url = $event ?? ''" /></el-form-item
        ><el-form-item :label="t('相册')"
          ><el-input
            v-model="translation.album"
            :lang="contentLang(contentLocale)"
            maxlength="100" /></el-form-item></template
      ><template v-else
        ><el-form-item :label="t('名称')"
          ><el-input
            v-model="translation.name"
            :lang="contentLang(contentLocale)"
            maxlength="100"
            required /></el-form-item
        ><el-form-item :label="t('网址')"
          ><el-input
            v-model="form.url"
            type="url"
            placeholder="https://"
            required /></el-form-item
        ><el-form-item :label="t('分组')"
          ><el-input
            v-model="translation.group"
            :lang="contentLang(contentLocale)"
            maxlength="100" /></el-form-item
        ><el-form-item :label="t('头像')"
          ><AssetPicker
            v-model="form.logoUrl"
            :disabled="busy"
            @busy-change="uploads.asset = $event" /></el-form-item></template
      ><template v-if="kind !== 'moments'"
        ><el-form-item :label="t('描述')"
          ><el-input
            v-model="translation.description"
            :lang="contentLang(contentLocale)"
            type="textarea"
            maxlength="500" /></el-form-item
        ><el-form-item :label="t('公开展示')"
          ><el-switch v-model="form.published" /></el-form-item></template
      ><el-button
        type="primary"
        native-type="submit"
        :loading="busy"
        :disabled="uploading"
        >{{ t('保存') }}</el-button
      ></el-form
    ></el-dialog
  >
</template>
