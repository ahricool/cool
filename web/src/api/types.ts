export type Status = "draft" | "published" | "archived";

export interface SiteSettings {
  title: string;
  subtitle: string;
  description: string;
  logo?: string;
  heroImage?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl?: string;
  status: Status;
  author?: Author;
  category?: Category;
  tags: Tag[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Dashboard {
  posts: number;
  published: number;
  drafts: number;
  categories: number;
  tags: number;
  views: number;
}

export interface PostInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverUrl?: string;
  status: Status;
  categoryId?: string | null;
  tagIds: string[];
}
