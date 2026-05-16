import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView";
import PostView from "./views/PostView";
import AdminDashboard from "./views/AdminDashboard";
import PostEditor from "./views/PostEditor";
import TaxonomyView from "./views/TaxonomyView";
import SettingsView from "./views/SettingsView";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/posts/:slug", name: "post", component: PostView },
    { path: "/admin", name: "admin", component: AdminDashboard },
    { path: "/admin/posts/new", name: "post-new", component: PostEditor },
    { path: "/admin/posts/:id/edit", name: "post-edit", component: PostEditor },
    { path: "/admin/taxonomy", name: "taxonomy", component: TaxonomyView },
    { path: "/admin/settings", name: "settings", component: SettingsView },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});
