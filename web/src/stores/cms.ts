import { reactive } from "vue";
import { api } from "../api/client";
import type { Category, Dashboard, Page, Post, SiteSettings, Tag } from "../api/types";

const defaultPage: Page<Post> = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

const state = reactive({
  site: {
    title: "Cool CMS",
    subtitle: "Vue3 + Fastify 内容系统",
    description: "",
    heroImage: "",
  } as SiteSettings,
  dashboard: null as Dashboard | null,
  posts: defaultPage,
  categories: [] as Category[],
  tags: [] as Tag[],
  loading: false,
  error: "",
});

async function run<T>(task: () => Promise<T>) {
  state.loading = true;
  state.error = "";
  try {
    return await task();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "请求失败";
    throw error;
  } finally {
    state.loading = false;
  }
}

export function useCmsStore() {
  return {
    get site() {
      return state.site;
    },
    get dashboard() {
      return state.dashboard;
    },
    get posts() {
      return state.posts;
    },
    get categories() {
      return state.categories;
    },
    get tags() {
      return state.tags;
    },
    get loading() {
      return state.loading;
    },
    get error() {
      return state.error;
    },
    async bootstrap() {
      await Promise.all([this.loadSite(), this.loadTaxonomy()]);
    },
    async loadSite() {
      const site = await run(() => api.site());
      state.site = { ...state.site, ...site };
    },
    async loadDashboard() {
      state.dashboard = await run(() => api.dashboard());
    },
    async loadPosts(params: Record<string, string | number | undefined> = {}) {
      state.posts = await run(() => api.posts(params));
    },
    async loadTaxonomy() {
      const [categories, tags] = await run(() => Promise.all([api.categories(), api.tags()]));
      state.categories = categories;
      state.tags = tags;
    },
    async saveSite(site: SiteSettings) {
      state.site = await run(() => api.updateSite(site));
    },
  };
}
