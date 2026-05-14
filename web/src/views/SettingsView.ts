import { defineComponent, onMounted, reactive } from "vue";
import AdminShell from "../components/AdminShell";
import { useCmsStore } from "../stores/cms";

export default defineComponent({
  name: "SettingsView",
  components: { AdminShell },
  setup() {
    const store = useCmsStore();
    const form = reactive({
      title: "",
      subtitle: "",
      description: "",
      logo: "",
      heroImage: "",
    });

    async function load() {
      await store.loadSite();
      Object.assign(form, store.site);
    }

    async function save() {
      await store.saveSite(form);
    }

    onMounted(load);
    return { form, save };
  },
  template: `
    <AdminShell>
      <form class="admin-panel settings-form" @submit.prevent="save">
        <h2>站点设置</h2>
        <label>
          站点标题
          <input v-model="form.title" />
        </label>
        <label>
          副标题
          <input v-model="form.subtitle" />
        </label>
        <label>
          描述
          <textarea v-model="form.description" rows="4"></textarea>
        </label>
        <label>
          Logo URL
          <input v-model="form.logo" placeholder="https://..." />
        </label>
        <label>
          首页首图 URL
          <input v-model="form.heroImage" placeholder="https://..." />
        </label>
        <button class="primary">保存设置</button>
      </form>
    </AdminShell>
  `,
});
