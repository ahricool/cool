import { defineComponent, onMounted, reactive } from "vue";
import { api } from "../api/client";
import AdminShell from "../components/AdminShell";
import { useCmsStore } from "../stores/cms";

export default defineComponent({
  name: "TaxonomyView",
  components: { AdminShell },
  setup() {
    const store = useCmsStore();
    const category = reactive({ name: "", slug: "", description: "" });
    const tag = reactive({ name: "", slug: "" });

    async function createCategory() {
      await api.createCategory(category);
      category.name = "";
      category.slug = "";
      category.description = "";
      await store.loadTaxonomy();
    }

    async function createTag() {
      await api.createTag(tag);
      tag.name = "";
      tag.slug = "";
      await store.loadTaxonomy();
    }

    onMounted(() => store.loadTaxonomy());
    return { store, category, tag, createCategory, createTag };
  },
  template: `
    <AdminShell>
      <div class="two-column">
        <section class="admin-panel">
          <h3>分类</h3>
          <form @submit.prevent="createCategory" class="stack-form">
            <input v-model="category.name" placeholder="分类名称" />
            <input v-model="category.slug" placeholder="slug，可留空" />
            <textarea v-model="category.description" placeholder="描述"></textarea>
            <button class="primary">新增分类</button>
          </form>
          <ul class="taxonomy-list">
            <li v-for="item in store.categories" :key="item.id">
              <span>{{ item.name }}</span>
              <small>{{ item.slug }} · {{ item.postCount || 0 }} 篇</small>
            </li>
          </ul>
        </section>

        <section class="admin-panel">
          <h3>标签</h3>
          <form @submit.prevent="createTag" class="stack-form">
            <input v-model="tag.name" placeholder="标签名称" />
            <input v-model="tag.slug" placeholder="slug，可留空" />
            <button class="primary">新增标签</button>
          </form>
          <ul class="taxonomy-list tag-cloud">
            <li v-for="item in store.tags" :key="item.id">
              <span>#{{ item.name }}</span>
              <small>{{ item.postCount || 0 }} 篇</small>
            </li>
          </ul>
        </section>
      </div>
    </AdminShell>
  `,
});
