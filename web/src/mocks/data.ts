import type { Post, Page, Tag, Category, SiteConfig } from '../services/api';

export const mockSiteConfig: SiteConfig = {
  title: 'Sakura Theme',
  subtitle: 'A beautiful blog theme',
  description: 'A CMS blog powered by Strapi + Vue 3',
  logo: '',
  favicon: '/favicon.ico',
  url: 'https://example.com',
};

export const mockTags: Tag[] = [
  { id: '1', name: 'Vue.js', slug: 'vue-js', count: 0 },
  { id: '2', name: 'TypeScript', slug: 'typescript', count: 0 },
  { id: '3', name: 'Frontend', slug: 'frontend', count: 0 },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Technology', slug: 'technology', count: 0 },
  { id: '2', name: 'Life', slug: 'life', count: 0 },
];

export const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Welcome',
    slug: 'welcome',
    excerpt: 'Welcome to this CMS blog.',
    content: '# Welcome\n\nThis is a sample post.',
    author: { id: '1', name: 'Admin' },
    tags: [],
    categories: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    views: 0,
    likes: 0,
  },
];

export const mockPages: Page[] = [
  {
    id: '1',
    title: 'About',
    slug: 'about',
    content: '# About\n\nThis is the about page.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
