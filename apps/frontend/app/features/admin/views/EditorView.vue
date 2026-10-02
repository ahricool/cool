<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
  onBeforeUnmount,
} from 'vue';
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
  type RouteLocationNormalized,
} from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Post, Page, Taxonomy, Status } from '@cms/content';
import { api, errorText } from '../api';
import { takeEditorDraft, transferEditorDraft } from '../editor-drafts';
import { publicUrl } from '../publicUrl';
import ViewHeader from '../components/ViewHeader.vue';
import ErrorNotice from '../components/ErrorNotice.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import AssetPicker from '../components/AssetPicker.vue';
const props = withDefaults(defineProps<{ kind?: 'posts' | 'pages' }>(), {
  kind: 'posts',
});
const route = useRoute();
const router = useRouter();
const id = String(route.params.id);
const isNew = id === 'new';
const key = `cms-draft-${props.kind}-${id}`;
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
const uploads = reactive({ content: false, cover: false });
const uploading = computed(() => uploads.content || uploads.cover);
const error = ref('');
const draft = ref<string | null>(null);
const categories = ref<Taxonomy[]>([]);
const tags = ref<Taxonomy[]>([]);
let savedRoute = '';
let active = true;
const dirty = computed(
  () => loaded.value && JSON.stringify(form) !== baseline.value,
);
async function load() {
  error.value = '';
  try {
    if (props.kind === 'posts') {
      [categories.value, tags.value] = await Promise.all([
        api<Taxonomy[]>('/admin/categories'),
        api<Taxonomy[]>('/admin/tags'),
      ]);
    }
    if (!isNew) {
      const d = await api<Post | Page>(`/admin/${props.kind}/${id}`);
      Object.assign(form, {
        title: d.title,
        slug: d.slug,
        content: d.content ?? '',
        coverUrl: d.coverUrl,
        status: d.status ?? 'DRAFT',
        publishedAt: d.publishedAt,
      });
      if ('excerpt' in d) {
        form.excerpt = d.excerpt;
        form.categoryIds = d.categories.map((c) => c.category.id);
        form.tagIds = d.tags.map((t) => t.tag.id);
      }
    }
    baseline.value = JSON.stringify(form);
    loaded.value = true;
    draft.value = sessionStorage.getItem(key);
    const transferred = takeEditorDraft(key);
    if (transferred) {
      Object.assign(form, JSON.parse(transferred));
      draft.value = null;
    }
  } catch (e) {
    error.value = errorText(e);
  }
}
function restore() {
  if (draft.value) {
    try {
      Object.assign(form, JSON.parse(draft.value));
    } catch {
      sessionStorage.removeItem(key);
    }
    draft.value = null;
  }
}
function discard() {
  sessionStorage.removeItem(key);
  draft.value = null;
}
watch(
  form,
  () => {
    if (dirty.value) sessionStorage.setItem(key, JSON.stringify(form));
  },
  { deep: true },
);
async function save(status: Status) {
  if (busy.value || uploading.value || !loaded.value) return;
  if (!form.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    ElMessage.warning('请填写标题和有效的 URL 标识（小写字母、数字、连字符）');
    return;
  }
  busy.value = true;
  error.value = '';
  // Never compare the response against the live form: the author may keep
  // typing (or an image upload may finish) while this request is in flight.
  const submitted = JSON.parse(JSON.stringify(form)) as typeof form;
  try {
    const body =
      props.kind === 'posts'
        ? { ...submitted, status }
        : {
            title: submitted.title,
            slug: submitted.slug,
            content: submitted.content,
            coverUrl: submitted.coverUrl,
            status,
            publishedAt: submitted.publishedAt,
          };
    const saved = await api<Post | Page>(
      `/admin/${props.kind}${isNew ? '' : '/' + id}`,
      { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) },
    );
    if (!active) return;
    form.status = saved.status ?? 'DRAFT';
    if (form.publishedAt === submitted.publishedAt)
      form.publishedAt = saved.publishedAt;
    baseline.value = JSON.stringify({
      ...submitted,
      status: saved.status ?? 'DRAFT',
      publishedAt: saved.publishedAt,
    });
    if (dirty.value) sessionStorage.setItem(key, JSON.stringify(form));
    else sessionStorage.removeItem(key);
    ElMessage.success(status === 'PUBLISHED' ? '已保存发布状态' : '已保存');
    if (isNew) {
      if (dirty.value)
        transferEditorDraft(
          `cms-draft-${props.kind}-${saved.id}`,
          JSON.stringify(form),
        );
      savedRoute = `/admin/${props.kind}/${saved.id}`;
      const failure = await router.replace(savedRoute);
      if (!failure) sessionStorage.removeItem(key);
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
    ElMessage.info('正在保存或上传，请稍候再离开');
    return false;
  }
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(
      '有未保存的修改。浏览器草稿已保留，确定离开？',
      '离开编辑器',
      { confirmButtonText: '离开', cancelButtonText: '继续编辑' },
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
      isNew ? (kind === 'posts' ? '写一篇新文章' : '新建独立页面') : '继续编辑'
    "
    :description="
      dirty ? '有未保存的修改 · 浏览器草稿已保留' : '让文字保持你的温度。'
    "
    ><el-button
      :disabled="!loaded || uploading"
      :loading="busy"
      @click="save(form.status)"
      >保存{{ form.status === 'DRAFT' ? '草稿' : '' }}</el-button
    ><el-button
      v-if="form.status === 'PUBLISHED'"
      :disabled="uploading"
      :loading="busy"
      @click="save('DRAFT')"
      >撤回为草稿</el-button
    ><el-button
      v-else
      type="primary"
      :disabled="!loaded || uploading"
      :loading="busy"
      @click="save('PUBLISHED')"
      >发布</el-button
    ></ViewHeader
  ><ErrorNotice :error="error" @retry="load" /><el-alert
    v-if="draft"
    type="warning"
    :closable="false"
    title="发现此页面的浏览器草稿"
    ><el-button text @click="restore">恢复草稿</el-button
    ><el-button text @click="discard">丢弃草稿</el-button></el-alert
  >
  <div v-if="loaded" class="edit-layout">
    <section class="panel editor-main">
      <el-input
        v-model="form.title"
        class="title-input"
        placeholder="给文章一个标题"
        maxlength="200"
        aria-label="标题"
      /><MarkdownEditor
        v-model="form.content"
        :disabled="busy"
        @busy-change="uploads.content = $event"
      />
    </section>
    <aside class="editor-settings panel">
      <h2>发布设置</h2>
      <el-form label-position="top"
        ><el-form-item label="URL 标识"
          ><el-input
            v-model="form.slug"
            maxlength="160"
            placeholder="my-first-story"
          /><small class="muted"
            >/{{ kind }}/{{ form.slug || 'slug' }}</small
          ></el-form-item
        ><el-form-item label="发布时间"
          ><el-date-picker
            v-model="form.publishedAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            placeholder="发布时自动填入"
            clearable
        /></el-form-item>
        <p class="muted">设置未来时间后，访客会在该时间开始看到内容。</p>
        <el-form-item v-if="kind === 'posts'" label="摘要"
          ><el-input
            v-model="form.excerpt"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit /></el-form-item
        ><el-form-item label="封面"
          ><AssetPicker
            v-model="form.coverUrl"
            :disabled="busy"
            @busy-change="uploads.cover = $event" /></el-form-item
        ><template v-if="kind === 'posts'"
          ><el-form-item label="分类"
            ><el-select
              v-model="form.categoryIds"
              multiple
              placeholder="选择分类"
              ><el-option
                v-for="term in categories"
                :key="term.id"
                :label="term.name"
                :value="term.id" /></el-select></el-form-item
          ><el-form-item label="标签"
            ><el-select v-model="form.tagIds" multiple placeholder="选择标签"
              ><el-option
                v-for="term in tags"
                :key="term.id"
                :label="term.name"
                :value="term.id" /></el-select></el-form-item></template
        ><a
          v-if="!isNew && form.status === 'PUBLISHED'"
          :href="publicUrl(`/${kind}/${form.slug}`)"
          target="_blank"
          rel="noopener"
          >查看公开页面 ↗</a
        ></el-form
      >
    </aside>
  </div>
</template>
