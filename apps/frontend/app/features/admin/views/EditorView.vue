<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
  onBeforeUnmount,
  nextTick,
} from 'vue';
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
  type RouteLocationNormalized,
} from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { toast } from '~/utils/toast';
import type {
  AdminPost,
  AdminPage,
  AdminTaxonomy,
  Status,
} from '@cool/content';
import { api, errorText } from '../api';
import { takeEditorDraft, transferEditorDraft } from '../editor-drafts';
import { publicPath, isLocale, type CoolLocale } from '~/i18n/locale';
import { displayTranslation } from '../content';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import AssetPicker from '../components/AssetPicker.vue';
const props = withDefaults(defineProps<{ kind?: 'posts' | 'pages' }>(), {
  kind: 'posts',
});
const { t, locale, contentLang } = useCoolI18n();
const route = useRoute();
const router = useRouter();
const id = String(route.params.id);
const isNew = id === 'new';
let remembered: string | null = null;
try {
  remembered = sessionStorage.getItem('cool-editor-locale');
} catch {
  /* Storage may be unavailable. */
}
const contentLocale = ref<CoolLocale>(
  isLocale(remembered) ? remembered : locale.value,
);
const key = computed(
  () => `cool-draft-${props.kind}-${id}-${contentLocale.value}`,
);
const sharedKey = computed(() => `cool-draft-shared-${props.kind}-${id}`);
const applyingLanguage = ref(false);
const document = ref<AdminPost | AdminPage>();
const emptyTranslation = () => ({
  title: '',
  excerpt: '',
  content: '',
  status: 'DRAFT' as Status,
  publishedAt: null as string | null,
});
const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverUrl: null as string | null,
  status: 'DRAFT' as Status,
  publishedAt: null as string | null,
  categoryIds: [] as string[],
  tagIds: [] as string[],
});
const baseline = ref('');
const loaded = ref(false);
const busy = ref(false);
const switching = ref(false);
const uploads = reactive({ content: false, cover: false });
const uploading = computed(() => uploads.content || uploads.cover);
const error = ref('');
const draft = ref<string | null>(null);
const categories = ref<AdminTaxonomy[]>([]);
const tags = ref<AdminTaxonomy[]>([]);
let savedRoute = '';
let active = true;
const dirty = computed(
  () => loaded.value && JSON.stringify(form) !== baseline.value,
);
async function load() {
  applyingLanguage.value = true;
  loaded.value = false;
  error.value = '';
  try {
    if (props.kind === 'posts') {
      [categories.value, tags.value] = await Promise.all([
        api<AdminTaxonomy[]>('/admin/categories'),
        api<AdminTaxonomy[]>('/admin/tags'),
      ]);
    }
    if (!isNew)
      document.value = await api<AdminPost | AdminPage>(
        `/admin/${props.kind}/${id}`,
      );
    if (!active) return;
    applyLanguage();
    baseline.value = JSON.stringify(form);
    // Common fields belong to the logical document, not an individual language.
    const shared = readSharedDraft();
    if (shared) Object.assign(form, shared);
    draft.value = sessionStorage.getItem(key.value);
    const transferred = takeEditorDraft(key.value);
    if (transferred) {
      Object.assign(form, JSON.parse(transferred));
      draft.value = null;
    }
    await nextTick();
    loaded.value = true;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    applyingLanguage.value = false;
  }
}
function applyLanguage() {
  const d = document.value;
  const translation = d?.translations.find(
    (item) => item.locale === contentLocale.value,
  );
  Object.assign(form, emptyTranslation(), {
    title: translation?.title ?? '',
    content: translation?.content ?? '',
    excerpt: translation && 'excerpt' in translation ? translation.excerpt : '',
    status: translation?.status ?? 'DRAFT',
    publishedAt: translation?.publishedAt ?? null,
    slug: d?.slug ?? '',
    coverUrl: d?.coverUrl ?? null,
    categoryIds:
      d && 'categories' in d ? d.categories.map((c) => c.category.id) : [],
    tagIds: d && 'tags' in d ? d.tags.map((item) => item.tag.id) : [],
  });
  baseline.value = JSON.stringify(form);
}
function sharedFields(value: typeof form = form) {
  return {
    slug: value.slug,
    coverUrl: value.coverUrl,
    categoryIds: [...value.categoryIds],
    tagIds: [...value.tagIds],
  };
}
function readSharedDraft() {
  const stored = sessionStorage.getItem(sharedKey.value);
  if (!stored) return undefined;
  try {
    const value = JSON.parse(stored) as ReturnType<typeof sharedFields>;
    if (
      !value ||
      typeof value.slug !== 'string' ||
      !(value.coverUrl === null || typeof value.coverUrl === 'string') ||
      !Array.isArray(value.categoryIds) ||
      !Array.isArray(value.tagIds)
    )
      throw new Error('Invalid draft');
    return {
      slug: value.slug,
      coverUrl: value.coverUrl,
      categoryIds: value.categoryIds.filter((id) => typeof id === 'string'),
      tagIds: value.tagIds.filter((id) => typeof id === 'string'),
    };
  } catch {
    sessionStorage.removeItem(sharedKey.value);
    return undefined;
  }
}
function draftTranslation(serialized: string) {
  const value = JSON.parse(serialized) as typeof form;
  if (
    !value ||
    typeof value.title !== 'string' ||
    typeof value.content !== 'string'
  )
    throw new Error('Invalid draft');
  return {
    title: value.title,
    content: value.content,
    excerpt: value.excerpt ?? '',
    status: value.status ?? 'DRAFT',
    publishedAt: value.publishedAt ?? null,
  };
}
function persistDraft() {
  // Pending recovery text and common edits are independent. Shared-only edits
  // cannot replace or create an empty language draft behind the recovery notice.
  let pending: ReturnType<typeof draftTranslation> | undefined;
  if (draft.value) {
    try {
      pending = draftTranslation(draft.value);
    } catch {
      draft.value = null;
    }
  }
  const translated = pending ?? draftTranslation(JSON.stringify(form));
  const baselineForm = JSON.parse(baseline.value) as typeof form;
  if (
    pending ||
    JSON.stringify(translated) !==
      JSON.stringify(draftTranslation(baseline.value))
  ) {
    sessionStorage.setItem(
      key.value,
      JSON.stringify({ ...form, ...translated }),
    );
  } else sessionStorage.removeItem(key.value);
  const shared = JSON.stringify(sharedFields());
  if (shared !== JSON.stringify(sharedFields(baselineForm)))
    sessionStorage.setItem(sharedKey.value, shared);
  else sessionStorage.removeItem(sharedKey.value);
}
function applyTranslationDraft(serialized: string) {
  Object.assign(form, draftTranslation(serialized));
}
async function switchLanguage(value: CoolLocale) {
  if (
    !loaded.value ||
    value === contentLocale.value ||
    busy.value ||
    uploading.value ||
    switching.value
  )
    return;
  switching.value = true;
  try {
    if (dirty.value) {
      try {
        await ElMessageBox.confirm(
          t('当前语言有未保存修改，草稿已保留。切换语言？'),
          t('切换内容语言'),
          { confirmButtonText: t('切换'), cancelButtonText: t('继续编辑') },
        );
      } catch {
        return;
      }
    }
    if (!active) return;
    if (dirty.value) persistDraft();
    const shared = sharedFields();
    applyingLanguage.value = true;
    loaded.value = false;
    contentLocale.value = value;
    sessionStorage.setItem('cool-editor-locale', value);
    applyLanguage();
    const pending = sessionStorage.getItem(key.value);
    if (pending) {
      try {
        applyTranslationDraft(pending);
      } catch {
        sessionStorage.removeItem(key.value);
      }
    }
    // Shared identity fields never come from an older per-language snapshot.
    Object.assign(form, shared);
    draft.value = null;
    // Flush the deep form watcher while persistence is explicitly suppressed.
    await nextTick();
    loaded.value = true;
  } finally {
    applyingLanguage.value = false;
    switching.value = false;
  }
}
function restore() {
  if (draft.value) {
    try {
      applyTranslationDraft(draft.value);
    } catch {
      sessionStorage.removeItem(key.value);
    }
    draft.value = null;
  }
}
async function discard() {
  applyingLanguage.value = true;
  try {
    sessionStorage.removeItem(key.value);
    const otherLocale = contentLocale.value === 'zh' ? 'en' : 'zh';
    const otherDraft = sessionStorage.getItem(
      `cool-draft-${props.kind}-${id}-${otherLocale}`,
    );
    const shared = otherDraft ? readSharedDraft() : undefined;
    applyLanguage();
    // A remaining language draft still owns the common edits. Discarding the
    // last language draft also discards the shared browser-only edits.
    if (shared) Object.assign(form, shared);
    else sessionStorage.removeItem(sharedKey.value);
    draft.value = null;
    await nextTick();
  } finally {
    applyingLanguage.value = false;
  }
}

watch(
  form,
  () => {
    if (!applyingLanguage.value && loaded.value) persistDraft();
  },
  { deep: true },
);
async function save(status: Status) {
  if (busy.value || uploading.value || !loaded.value || draft.value) return;
  if (!form.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    toast.warning(t('请填写标题和有效的 链接名称（小写字母、数字、连字符）'));
    return;
  }
  busy.value = true;
  error.value = '';
  // Never compare the response against the live form: the author may keep
  // typing (or an image upload may finish) while this request is in flight.
  const submitted = JSON.parse(JSON.stringify(form)) as typeof form;
  try {
    const translated = {
      locale: contentLocale.value,
      title: submitted.title,
      content: submitted.content,
      status,
      publishedAt: submitted.publishedAt,
      ...(props.kind === 'posts' ? { excerpt: submitted.excerpt } : {}),
    };
    const body = {
      slug: submitted.slug,
      coverUrl: submitted.coverUrl,
      translations: [translated],
      ...(props.kind === 'posts'
        ? { categoryIds: submitted.categoryIds, tagIds: submitted.tagIds }
        : {}),
    };
    const saved = await api<AdminPost | AdminPage>(
      `/admin/${props.kind}${isNew ? '' : '/' + id}`,
      { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) },
    );
    if (!active) return;
    document.value = saved;
    const savedTranslation = saved.translations.find(
      (item) => item.locale === contentLocale.value,
    )!;
    form.status = savedTranslation.status ?? 'DRAFT';
    if (form.publishedAt === submitted.publishedAt)
      form.publishedAt = savedTranslation.publishedAt;
    baseline.value = JSON.stringify({
      ...submitted,
      status: savedTranslation.status ?? 'DRAFT',
      publishedAt: savedTranslation.publishedAt,
    });
    if (dirty.value) persistDraft();
    else {
      sessionStorage.removeItem(key.value);
      sessionStorage.removeItem(sharedKey.value);
    }
    toast.success(status === 'PUBLISHED' ? t('已保存发布状态') : t('已保存'));
    if (isNew) {
      // Associate drafts in the other language with the newly created identity.
      for (const language of ['zh', 'en'] as const) {
        if (language === contentLocale.value) continue;
        const pending = sessionStorage.getItem(
          `cool-draft-${props.kind}-${id}-${language}`,
        );
        if (pending)
          sessionStorage.setItem(
            `cool-draft-${props.kind}-${saved.id}-${language}`,
            pending,
          );
      }
      const sharedDraft = sessionStorage.getItem(sharedKey.value);
      if (sharedDraft)
        sessionStorage.setItem(
          `cool-draft-shared-${props.kind}-${saved.id}`,
          sharedDraft,
        );
      sessionStorage.setItem('cool-editor-locale', contentLocale.value);
      if (dirty.value)
        transferEditorDraft(
          `cool-draft-${props.kind}-${saved.id}-${contentLocale.value}`,
          JSON.stringify(form),
        );
      savedRoute = `/admin/${props.kind}/${saved.id}`;
      const failure = await router.replace(savedRoute);
      if (!failure) {
        for (const language of ['zh', 'en'] as const)
          sessionStorage.removeItem(
            `cool-draft-${props.kind}-${id}-${language}`,
          );
        sessionStorage.removeItem(sharedKey.value);
      }
      savedRoute = '';
    }
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value || busy.value || uploading.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
onMounted(() => {
  void load();
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => {
  active = false;
  window.removeEventListener('beforeunload', beforeUnload);
});
async function confirmNavigation(to: RouteLocationNormalized) {
  // Authentication expiry keeps the browser draft and must not strand the
  // author behind a stale authenticated screen or a leave-confirm dialog.
  if (to.path === '/admin/login' || to.path === savedRoute) return true;
  if (busy.value || uploading.value) {
    toast.info(t('正在保存或上传，请稍候再离开'));
    return false;
  }
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(
      t('有未保存的修改。草稿已保留，确定离开？'),
      t('离开编辑器'),
      { confirmButtonText: t('离开'), cancelButtonText: t('继续编辑') },
    );
    return true;
  } catch {
    return false;
  }
}
onBeforeRouteLeave(confirmNavigation);
onBeforeRouteUpdate(confirmNavigation);
</script>
<template>
  <ViewHeader
    :title="
      isNew
        ? kind === 'posts'
          ? t('写一篇新文章')
          : t('新建独立页面')
        : t('继续编辑')
    "
    :description="dirty ? t('有未保存的修改 · 草稿已保留') : undefined"
    ><el-button
      :disabled="!loaded || uploading || !!draft"
      :loading="busy"
      @click="save(form.status)"
      >{{ form.status === 'DRAFT' ? t('保存草稿') : t('保存') }}</el-button
    ><el-button
      v-if="form.status === 'PUBLISHED'"
      :disabled="uploading || !!draft"
      :loading="busy"
      @click="save('DRAFT')"
      >{{ t('撤回为草稿') }}</el-button
    ><el-button
      v-else
      type="primary"
      :disabled="!loaded || uploading || !!draft"
      :loading="busy"
      @click="save('PUBLISHED')"
      >{{ t('发布') }}</el-button
    ></ViewHeader
  ><ErrorNotice
    :error="error"
    @retry="loaded ? save(form.status) : load()"
  /><el-alert
    v-if="draft"
    type="warning"
    :closable="false"
    :title="t('发现未保存的草稿')"
    ><el-button text @click="restore">{{ t('恢复草稿') }}</el-button
    ><el-button text @click="discard">{{ t('丢弃草稿') }}</el-button></el-alert
  >
  <div class="content-language-tabs" role="group" :aria-label="t('内容语言')">
    <button
      type="button"
      :aria-pressed="contentLocale === 'zh'"
      :disabled="!loaded || busy || uploading || switching"
      @click="switchLanguage('zh')"
    >
      简体中文
    </button>
    <button
      type="button"
      :aria-pressed="contentLocale === 'en'"
      :disabled="!loaded || busy || uploading || switching"
      @click="switchLanguage('en')"
    >
      English
    </button>
    <small>{{ t('每种语言独立保存和发布') }}</small>
  </div>
  <div v-if="loaded" class="edit-layout">
    <section class="panel editor-main">
      <el-input
        v-model="form.title"
        :readonly="!!draft"
        :lang="contentLang(contentLocale)"
        class="title-input"
        :placeholder="t('给文章一个标题')"
        maxlength="200"
        :aria-label="t('标题')"
      /><MarkdownEditor
        v-model="form.content"
        :content-locale="contentLocale"
        :read-only="!!draft"
        :disabled="busy"
        @busy-change="uploads.content = $event"
      />
    </section>
    <aside class="editor-settings panel">
      <h2>{{ t('发布设置') }}</h2>
      <el-form label-position="top"
        ><el-form-item :label="t('链接名称')"
          ><el-input
            v-model="form.slug"
            maxlength="160"
            placeholder="my-first-story"
          /><small class="muted"
            >/{{ kind }}/{{ form.slug || 'slug' }}</small
          ></el-form-item
        ><el-form-item :label="t('发布时间')"
          ><el-date-picker
            v-model="form.publishedAt"
            :disabled="!!draft"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            :placeholder="t('发布时自动填入')"
            clearable
        /></el-form-item>
        <p class="muted">
          {{ t('设置未来时间后，访客会在该时间开始看到内容。') }}
        </p>
        <el-form-item v-if="kind === 'posts'" :label="t('摘要')"
          ><el-input
            v-model="form.excerpt"
            :readonly="!!draft"
            :lang="contentLang(contentLocale)"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit /></el-form-item
        ><el-form-item :label="t('封面')"
          ><AssetPicker
            v-model="form.coverUrl"
            :disabled="busy"
            @busy-change="uploads.cover = $event" /></el-form-item
        ><template v-if="kind === 'posts'"
          ><el-form-item :label="t('分类')"
            ><el-select
              v-model="form.categoryIds"
              multiple
              :placeholder="t('选择分类')"
              ><el-option
                v-for="term in categories"
                :key="term.id"
                :label="displayTranslation(term)?.name ?? term.slug"
                :value="term.id" /></el-select></el-form-item
          ><el-form-item :label="t('标签')"
            ><el-select
              v-model="form.tagIds"
              multiple
              :placeholder="t('选择标签')"
              ><el-option
                v-for="term in tags"
                :key="term.id"
                :label="displayTranslation(term)?.name ?? term.slug"
                :value="term.id" /></el-select></el-form-item></template
        ><a
          v-if="!isNew && form.status === 'PUBLISHED'"
          :href="publicPath(`/${kind}/${form.slug}`)"
          target="_blank"
          rel="noopener"
          >{{ t('查看公开页面 ↗') }}</a
        ></el-form
      >
    </aside>
  </div>
</template>
