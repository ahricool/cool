import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

// API Base URL from environment variable
const baseURL = import.meta.env.VITE_API_BASE || '/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

// ─── Frontend interfaces ──────────────────────────────────────────────────────

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: Tag[];
  categories: Category[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  views: number;
  likes: number;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export interface SiteConfig {
  title: string;
  subtitle?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  url: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// ─── Strapi response transformers ────────────────────────────────────────────

function transformTag(item: { id: number; attributes: Record<string, unknown> }): Tag {
  const attrs = item.attributes;
  return {
    id: String(item.id),
    name: String(attrs.name ?? ''),
    slug: String(attrs.slug ?? ''),
    count: Number(attrs.postCount ?? 0),
  };
}

function transformCategory(item: { id: number; attributes: Record<string, unknown> }): Category {
  const attrs = item.attributes;
  return {
    id: String(item.id),
    name: String(attrs.name ?? ''),
    slug: String(attrs.slug ?? ''),
    count: Number(attrs.postCount ?? 0),
  };
}

function transformPost(item: { id: number; attributes: Record<string, unknown> }): Post {
  const attrs = item.attributes;
  const authorData = (attrs.author as { data?: { id: number; attributes: Record<string, unknown> } } | null)?.data;
  const tagsData = (attrs.tags as { data?: { id: number; attributes: Record<string, unknown> }[] } | null)?.data ?? [];
  const categoriesData = (attrs.categories as { data?: { id: number; attributes: Record<string, unknown> }[] } | null)?.data ?? [];

  return {
    id: String(item.id),
    title: String(attrs.title ?? ''),
    slug: String(attrs.slug ?? ''),
    excerpt: attrs.excerpt ? String(attrs.excerpt) : undefined,
    content: String(attrs.content ?? ''),
    cover: attrs.cover ? String(attrs.cover) : undefined,
    author: authorData
      ? {
          id: String(authorData.id),
          name: String(authorData.attributes.username ?? authorData.attributes.name ?? 'Unknown'),
          avatar: authorData.attributes.avatar ? String(authorData.attributes.avatar) : undefined,
        }
      : { id: '', name: 'Unknown' },
    tags: tagsData.map(transformTag),
    categories: categoriesData.map(transformCategory),
    createdAt: String(attrs.createdAt ?? ''),
    updatedAt: String(attrs.updatedAt ?? ''),
    publishedAt: String(attrs.publishedAt ?? attrs.createdAt ?? ''),
    views: Number(attrs.views ?? 0),
    likes: Number(attrs.likes ?? 0),
  };
}

function transformPage(item: { id: number; attributes: Record<string, unknown> }): Page {
  const attrs = item.attributes;
  return {
    id: String(item.id),
    title: String(attrs.title ?? ''),
    slug: String(attrs.slug ?? ''),
    content: String(attrs.content ?? ''),
    cover: attrs.cover ? String(attrs.cover) : undefined,
    createdAt: String(attrs.createdAt ?? ''),
    updatedAt: String(attrs.updatedAt ?? ''),
  };
}

function transformPagination<T>(
  data: { data: { id: number; attributes: Record<string, unknown> }[]; meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } } },
  transformer: (item: { id: number; attributes: Record<string, unknown> }) => T
): PaginatedResponse<T> {
  const pagination = data.meta?.pagination ?? { page: 1, pageSize: 10, pageCount: 1, total: 0 };
  return {
    items: (data.data ?? []).map(transformer),
    total: pagination.total,
    page: pagination.page,
    size: pagination.pageSize,
    totalPages: pagination.pageCount,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

const POPULATE_POSTS = 'tags,categories,author';

export const api = {
  // Posts
  async getPosts(params?: PaginationParams): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get('/posts', {
      params: {
        'pagination[page]': params?.page ?? 1,
        'pagination[pageSize]': params?.size ?? 10,
        populate: POPULATE_POSTS,
        publicationState: 'live',
        'sort[0]': 'publishedAt:desc',
      },
    });
    return transformPagination(response.data, transformPost);
  },

  async getPost(id: string): Promise<Post> {
    const response = await apiClient.get(`/posts/${id}`, {
      params: { populate: POPULATE_POSTS },
    });
    return transformPost(response.data.data);
  },

  async getPostBySlug(slug: string): Promise<Post> {
    const response = await apiClient.get(`/posts/slug/${slug}`, {
      params: { populate: POPULATE_POSTS },
    });
    return transformPost(response.data.data);
  },

  // Pages
  async getPages(params?: PaginationParams): Promise<PaginatedResponse<Page>> {
    const response = await apiClient.get('/pages', {
      params: {
        'pagination[page]': params?.page ?? 1,
        'pagination[pageSize]': params?.size ?? 10,
        publicationState: 'live',
      },
    });
    return transformPagination(response.data, transformPage);
  },

  async getPage(id: string): Promise<Page> {
    const response = await apiClient.get(`/pages/${id}`);
    return transformPage(response.data.data);
  },

  async getPageBySlug(slug: string): Promise<Page> {
    const response = await apiClient.get(`/pages/slug/${slug}`);
    return transformPage(response.data.data);
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const response = await apiClient.get('/tags', {
      params: { 'pagination[pageSize]': 100 },
    });
    return (response.data.data ?? []).map(transformTag);
  },

  async getTag(slug: string): Promise<Tag> {
    const response = await apiClient.get(`/tags/by-slug/${slug}`);
    return transformTag(response.data.data);
  },

  async getPostsByTag(slug: string, params?: PaginationParams): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get('/posts', {
      params: {
        'filters[tags][slug][$eq]': slug,
        'pagination[page]': params?.page ?? 1,
        'pagination[pageSize]': params?.size ?? 10,
        populate: POPULATE_POSTS,
        publicationState: 'live',
        'sort[0]': 'publishedAt:desc',
      },
    });
    return transformPagination(response.data, transformPost);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories', {
      params: { 'pagination[pageSize]': 100 },
    });
    return (response.data.data ?? []).map(transformCategory);
  },

  async getCategory(slug: string): Promise<Category> {
    const response = await apiClient.get(`/categories/by-slug/${slug}`);
    return transformCategory(response.data.data);
  },

  async getPostsByCategory(slug: string, params?: PaginationParams): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get('/posts', {
      params: {
        'filters[categories][slug][$eq]': slug,
        'pagination[page]': params?.page ?? 1,
        'pagination[pageSize]': params?.size ?? 10,
        populate: POPULATE_POSTS,
        publicationState: 'live',
        'sort[0]': 'publishedAt:desc',
      },
    });
    return transformPagination(response.data, transformPost);
  },

  // Site Config
  async getSiteConfig(): Promise<SiteConfig> {
    const response = await apiClient.get('/site-config');
    const attrs = (response.data.data?.attributes ?? {}) as Record<string, unknown>;
    return {
      title: String(attrs.title ?? 'My Blog'),
      subtitle: attrs.subtitle ? String(attrs.subtitle) : undefined,
      description: attrs.description ? String(attrs.description) : undefined,
      logo: attrs.logo ? String(attrs.logo) : undefined,
      favicon: attrs.favicon ? String(attrs.favicon) : '/favicon.ico',
      url: String(attrs.url ?? ''),
    };
  },

  // User
  async getUser(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    const u = response.data as Record<string, unknown>;
    return {
      id: String(u.id ?? ''),
      name: String(u.username ?? u.name ?? ''),
      email: String(u.email ?? ''),
      avatar: u.avatar ? String(u.avatar) : undefined,
      bio: u.bio ? String(u.bio) : undefined,
    };
  },

  // Search
  async searchPosts(query: string, params?: PaginationParams): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get('/posts', {
      params: {
        'filters[$or][0][title][$containsi]': query,
        'filters[$or][1][content][$containsi]': query,
        'pagination[page]': params?.page ?? 1,
        'pagination[pageSize]': params?.size ?? 10,
        populate: POPULATE_POSTS,
        publicationState: 'live',
        'sort[0]': 'publishedAt:desc',
      },
    });
    return transformPagination(response.data, transformPost);
  },
};

export default apiClient;
