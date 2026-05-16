import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api/client";
import type { PostInput, Status } from "../api/types";
import AdminShell from "../components/AdminShell";
import { useCmsStore } from "../stores/cms";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default defineComponent({
  name: "PostEditor",
  components: { AdminShell },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useCmsStore();
    const saving = ref(false);
    const form = reactive<PostInput>({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverUrl: "",
      status: "draft",
      categoryId: null,
      tagIds: [],
    });
    const isEdit = computed(() => Boolean(route.params.id));

    async function load() {
      await store.loadTaxonomy();
      if (!isEdit.value) return;
      const post = await api.post(String(route.params.id));
      form.title = post.title;
      form.slug = post.slug;
      form.excerpt = post.excerpt;
      form.content = post.content;
      form.coverUrl = post.coverUrl || "";
      form.status = post.status;
      form.categoryId = post.category?.id || null;
      form.tagIds = post.tags.map((tag) => tag.id);
    }

    function generateSlug() {
      form.slug = slugify(form.title);
    }

    async function save(status?: Status) {
      saving.value = true;
      const payload = { ...form, status: status || form.status };
      if (!payload.slug) payload.slug = slugify(payload.title);
      if (isEdit.value) {
        await api.updatePost(String(route.params.id), payload);
      } else {
        const created = await api.createPost(payload);
        await router.replace(`/admin/posts/${created.id}/edit`);
      }
      saving.value = false;
      await store.loadDashboard();
    }

    onMounted(load);
    return { store, form, isEdit, saving, generateSlug, save };
  },
  template: `
    <AdminShell>
      <form class="editor-grid" @submit.prevent="save()">
        <section class="editor-main">
          <h2>{{ isEdit ? '编辑文章' : '新建文章' }}</h2>
          <label>
            标题
            <input v-model="form.title" placeholder="输入文章标题" @blur="!form.slug && generateSlug()" />
          </label>
          <label>
            摘要
            <textarea v-model="form.excerpt" rows="3" placeholder="用于列表和搜索结果的简短摘要"></textarea>
          </label>
          <label>
            正文 HTML
            <textarea v-model="form.content" rows="18" placeholder="<p>从这里开始写...</p>"></textarea>
          </label>
        </section>

        <aside class="editor-side">
          <label>
            Slug
            <div class="inline-field">
              <input v-model="form.slug" placeholder="post-slug" />
              <button type="button" @click="generateSlug">生成</button>
            </div>
          </label>
          <label>
            封面图 URL
            <input v-model="form.coverUrl" placeholder="https://..." />
          </label>
          <label>
            分类
            <select v-model="form.categoryId">
              <option :value="null">未分类</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
          </label>
          <fieldset>
            <legend>标签</legend>
            <label class="check-row" v-for="tag in store.tags" :key="tag.id">
              <input type="checkbox" :value="tag.id" v-model="form.tagIds" />
              {{ tag.name }}
            </label>
          </fieldset>
          <label>
            状态
            <select v-model="form.status">
              <option value="draft">草稿</option>
              <option value="published">发布</option>
              <option value="archived">归档</option>
            </select>
          </label>
          <div class="button-row">
            <button type="submit" :disabled="saving">保存</button>
            <button class="primary" type="button" :disabled="saving" @click="save('published')">保存并发布</button>
          </div>
        </aside>
      </form>
    </AdminShell>
  `,
});
