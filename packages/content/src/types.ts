export type ContentLocale = 'zh' | 'en';
export type Locale = ContentLocale;
export interface LocalizedContent {
  contentLocale?: ContentLocale;
}
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
export interface Taxonomy extends LocalizedContent {
  id: string;
  name: string;
  slug: string;
}
export interface TaxonomyTranslation {
  locale: ContentLocale;
  name: string;
}
export interface AdminTaxonomy {
  id: string;
  slug: string;
  translations: TaxonomyTranslation[];
}
interface PostIdentity {
  id: string;
  slug: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  viewCount: number;
  commentCount: number;
}
export interface Post extends PostIdentity, LocalizedContent {
  title: string;
  excerpt: string;
  content?: string;
  contentFormat?: string;
  status?: Status;
  publishedAt: string | null;
  categories: { category: Taxonomy }[];
  tags: { tag: Taxonomy }[];
}
export interface PostTranslation {
  locale: ContentLocale;
  title: string;
  excerpt: string;
  content: string;
  contentFormat?: string;
  status: Status;
  publishedAt: string | null;
  updatedAt?: string;
}
export interface AdminPost extends PostIdentity {
  translations: PostTranslation[];
  categories: { category: AdminTaxonomy }[];
  tags: { tag: AdminTaxonomy }[];
}
interface PageIdentity {
  id: string;
  slug: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Page extends PageIdentity, LocalizedContent {
  title: string;
  content: string;
  status?: Status;
  publishedAt: string | null;
}
export interface PageTranslation {
  locale: ContentLocale;
  title: string;
  content: string;
  status: Status;
  publishedAt: string | null;
  updatedAt?: string;
}
export interface AdminPage extends PageIdentity {
  translations: PageTranslation[];
}
export interface Moment extends LocalizedContent {
  id: string;
  content: string;
  status?: Status;
  publishedAt: string | null;
  createdAt: string;
}
export interface MomentTranslation {
  locale: ContentLocale;
  content: string;
  status: Status;
  publishedAt: string | null;
  updatedAt?: string;
}
export interface AdminMoment {
  id: string;
  createdAt: string;
  updatedAt: string;
  translations: MomentTranslation[];
}
export interface Photo extends LocalizedContent {
  id: string;
  title: string;
  description: string;
  url: string;
  album: string;
  published?: boolean;
}
export interface PhotoTranslation {
  locale: ContentLocale;
  title: string;
  description: string;
  album: string;
}
export interface AdminPhoto {
  id: string;
  url: string;
  published: boolean;
  translations: PhotoTranslation[];
}
export interface FriendLink extends LocalizedContent {
  id: string;
  name: string;
  url: string;
  logoUrl: string | null;
  description: string;
  group: string;
  published?: boolean;
}
export interface LinkTranslation {
  locale: ContentLocale;
  name: string;
  description: string;
  group: string;
}
export interface AdminFriendLink {
  id: string;
  url: string;
  logoUrl: string | null;
  published: boolean;
  translations: LinkTranslation[];
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
  post?: {
    id: string;
    slug: string;
    translations: { locale: ContentLocale; title: string }[];
  };
}
export interface Site extends LocalizedContent {
  title: string;
  description: string;
  authorName: string;
  authorBio: string;
  avatarUrl: string | null;
  commentsEnabled: boolean;
}
export interface SiteTranslation {
  locale: ContentLocale;
  title: string;
  description: string;
  authorBio: string;
}
export interface AdminSite {
  authorName: string;
  avatarUrl: string | null;
  commentsEnabled: boolean;
  translations: SiteTranslation[];
}
export interface Homepage extends LocalizedContent {
  coverUrl: string;
  focusMode: 'avatar' | 'glitch-text';
  greeting: string;
  description: string;
  notice: string;
  wave: boolean;
}
export interface HomepageTranslation {
  locale: ContentLocale;
  greeting: string;
  description: string;
  notice: string;
}
export interface AdminHomepage {
  coverUrl: string;
  focusMode: 'avatar' | 'glitch-text';
  wave: boolean;
  translations: HomepageTranslation[];
}
export interface Social extends LocalizedContent {
  label: string;
  url: string;
}
export interface SocialTranslation {
  locale: ContentLocale;
  label: string;
}
export interface AdminSocial {
  url: string;
  translations: SocialTranslation[];
}
export interface Settings {
  site: Site;
  homepage: Homepage;
  social: Social[];
}
export interface AdminSettings {
  site: AdminSite;
  homepage: AdminHomepage;
  social: AdminSocial[];
}
export const defaultSite: Site = {
  title: 'Cool',
  description: '记录生活，也记录每一次灵感。',
  authorName: 'Administrator',
  authorBio: '在这里，收藏日常的微光。',
  avatarUrl: '/sakura/images/default/avatar.webp',
  commentsEnabled: true,
  contentLocale: 'zh',
};
export const defaultHomepage: Homepage = {
  coverUrl: '/sakura/images/default/hd.webp',
  focusMode: 'glitch-text',
  greeting: 'Hi, Cool!',
  description: 'You got to put the past behind you before you can move on.',
  notice: '欢迎来到我的小小世界。',
  wave: true,
  contentLocale: 'zh',
};
export const formatDate = (
  date: string | null,
  locale: ContentLocale = 'zh',
) =>
  date
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai',
      }).format(new Date(date))
    : '';
