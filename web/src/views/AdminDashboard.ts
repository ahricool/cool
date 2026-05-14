import { defineComponent, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { api } from "../api/client";
import type { Post } from "../api/types";
import AdminShell from "../components/AdminShell";
import { useCmsStore } from "../stores/cms";

export default defineComponent({
  name: "AdminDashboard",
  components: { AdminShell, RouterLink },
  setup() {
    const store = useCmsStore();
    const status = ref("");

    async function load() {
      await Promise.all([store.loadDashboard(), store.loadPosts({ status: status.value, limit: 50 })]);
    }

    async function remove(post: Post) {
      if (!window.confirm(`删除文章「${post.title}」？`)) return;
      await api.deletePost(post.id);
      await load();
    }

    async function publish(post: Post) {
      await api.publishPost(post.id);
      await load();
    }

    onMounted(load);
    return { store, status, load, remove, publish };
  },
  template: `
    <AdminShell>
      <div class="admin-panel">
        <div class="stats-grid" v-if="store.dashboard">
          <div><strong>{{ store.dashboard.posts }}</strong><span>文章</span></div>
          <div><strong>{{ store.dashboard.published }}</strong><span>已发布</span></div>
          <div><strong>{{ store.dashboard.drafts }}</strong><span>草稿</span></div>
          <div><strong>{{ store.dashboard.views }}</strong><span>阅读</span></div>
        </div>
      </div>

      <div class="admin-panel">
        <div class="toolbar">
          <select v-model="status" @change="load">
            <option value="">全部状态</option>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="archived">归档</option>
          </select>
          <RouterLink class="admin-button admin-button-primary" to="/admin/posts/new">新建文章</RouterLink>
        </div>
        <table>
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>阅读</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in store.posts.items" :key="post.id">
              <td>
                <strong>{{ post.title }}</strong>
                <small>{{ post.slug }}</small>
              </td>
              <td>{{ post.category?.name || '未分类' }}</td>
              <td><span class="status-pill" :class="post.status">{{ post.status }}</span></td>
              <td>{{ post.viewCount }}</td>
              <td class="actions">
                <RouterLink :to="'/admin/posts/' + post.id + '/edit'">编辑</RouterLink>
                <button v-if="post.status !== 'published'" @click="publish(post)">发布</button>
                <button @click="remove(post)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminShell>
  `,
});
