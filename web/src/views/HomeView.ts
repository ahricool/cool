import { defineComponent, onMounted, reactive } from "vue";
import { RouterLink } from "vue-router";
import { useCmsStore } from "../stores/cms";
import PostCard from "../components/PostCard";

export default defineComponent({
  name: "HomeView",
  components: { PostCard, RouterLink },
  setup() {
    const store = useCmsStore();
    const filters = reactive({ q: "", category: "", tag: "" });

    async function load() {
      await store.loadPosts({ status: "published", q: filters.q, category: filters.category, tag: filters.tag });
    }

    onMounted(load);
    return { store, filters, load };
  },
  template: `
    <div id="primary" class="content-area" :data-error="store.error">
      <div id="main" class="site-main">
        <div class="notice" v-if="store.site.description">
          <div class="notice-content">{{ store.site.description }}</div>
        </div>

        <h1 class="main-title flex-child-center" style="font-family: 'Ubuntu', sans-serif">
          <span class="iconify" data-icon="fa:envira"></span>
          <span>Discovery</span>
        </h1>

        <form class="search-form" @submit.prevent="load">
          <input v-model="filters.q" placeholder="搜索文章" />
          <select v-model="filters.category" @change="load">
            <option value="">全部分类</option>
            <option v-for="category in store.categories" :key="category.id" :value="category.slug">{{ category.name }}</option>
          </select>
          <select v-model="filters.tag" @change="load">
            <option value="">全部标签</option>
            <option v-for="tag in store.tags" :key="tag.id" :value="tag.slug">{{ tag.name }}</option>
          </select>
          <button class="search-submit" type="submit">搜索</button>
        </form>

          <PostCard v-for="post in store.posts.items" :key="post.id" :post="post" />
          <div v-if="store.loading" class="sakura-vue-status">文章加载中...</div>
          <div v-if="!store.loading && store.posts.items.length === 0" class="sakura-vue-status">
            暂时没有符合条件的文章。
          </div>
      </div>
    </div>
  `,
});
