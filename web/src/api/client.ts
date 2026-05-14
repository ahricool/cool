import type { Category, Dashboard, Page, Post, PostInput, SiteSettings, Tag } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "请求失败");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  site: () => request<SiteSettings>("/site"),
  updateSite: (payload: SiteSettings) =>
    request<SiteSettings>("/site", { method: "PUT", body: JSON.stringify(payload) }),
  dashboard: () => request<Dashboard>("/dashboard"),
  posts: (params: Record<string, string | number | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") search.set(key, String(value));
    });
    const query = search.toString();
    return request<Page<Post>>(`/posts${query ? `?${query}` : ""}`);
  },
  post: (slugOrId: string) => request<Post>(`/posts/${slugOrId}`),
  createPost: (payload: PostInput) =>
    request<{ id: string; slug: string }>("/posts", { method: "POST", body: JSON.stringify(payload) }),
  updatePost: (id: string, payload: PostInput) =>
    request<{ id: string; slug: string }>(`/posts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePost: (id: string) => request<void>(`/posts/${id}`, { method: "DELETE" }),
  publishPost: (id: string) => request<{ id: string; slug: string }>(`/posts/${id}/publish`, { method: "POST" }),
  likePost: (id: string) => request<{ likeCount: number }>(`/posts/${id}/like`, { method: "POST" }),
  categories: () => request<Category[]>("/categories"),
  createCategory: (payload: Pick<Category, "name" | "slug" | "description">) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(payload) }),
  tags: () => request<Tag[]>("/tags"),
  createTag: (payload: Pick<Tag, "name" | "slug">) =>
    request<Tag>("/tags", { method: "POST", body: JSON.stringify(payload) }),
};
