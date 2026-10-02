export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface Author {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}
export interface Taxonomy {
  id: string;
  name: string;
  slug: string;
}
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  contentFormat?: string;
  coverUrl: string | null;
  status?: Status;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  viewCount: number;
  commentCount: number;
  categories: { category: Taxonomy }[];
  tags: { tag: Taxonomy }[];
}
export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  coverUrl: string | null;
  status: Status;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Moment {
  id: string;
  content: string;
  status: Status;
  publishedAt: string | null;
  createdAt: string;
}
export interface Photo {
  id: string;
  title: string;
  description: string;
  url: string;
  album: string;
  published: boolean;
}
export interface FriendLink {
  id: string;
  name: string;
  url: string;
  logoUrl: string | null;
  description: string;
  group: string;
  published: boolean;
}
export interface Media {
  id: string;
  key: string;
  url: string;
  originalName: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}
export interface Comment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  status?: 'PENDING' | 'APPROVED' | 'SPAM';
  post?: { title: string; slug: string };
}
export interface Site {
  title: string;
  description: string;
  authorName: string;
  authorBio: string;
  avatarUrl: string | null;
  commentsEnabled: boolean;
}
export interface Homepage {
  coverUrl: string;
  focusMode: 'avatar' | 'glitch-text';
  greeting: string;
  description: string;
  notice: string;
  wave: boolean;
}
export interface Social {
  label: string;
  url: string;
}
export interface Settings {
  site: Site;
  homepage: Homepage;
  social: Social[];
}
export const defaultSite: Site = {
  title: 'Sakura',
  description: '记录生活，也记录每一次灵感。',
  authorName: '站长',
  authorBio: '在这里，收藏日常的微光。',
  avatarUrl: '/sakura/images/default/avatar.webp',
  commentsEnabled: true,
};
export const defaultHomepage: Homepage = {
  coverUrl: '/sakura/images/default/hd.webp',
  focusMode: 'glitch-text',
  greeting: 'Hi, Sakura!',
  description: 'You got to put the past behind you before you can move on.',
  notice: '欢迎来到我的小小世界。',
  wave: true,
};
export const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai',
      }).format(new Date(date))
    : '';
