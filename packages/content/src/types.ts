export const DEFAULT_OWNER_EMAIL = 'whoreahri@gmail.com';
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
export interface Tag extends LocalizedContent {
  id: string;
  name: string;
  slug: string;
}
export interface TagTranslation {
  locale: ContentLocale;
  name: string;
}
export interface AdminTag {
  id: string;
  slug: string;
  translations: TagTranslation[];
}
interface PostIdentity {
  type: 'ARTICLE' | 'MOMENT';
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
  tags: { tag: Tag }[];
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
  tags: { tag: AdminTag }[];
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
export interface AlbumItem {
  id: string;
  albumId: string;
  mediaId: string | null;
  url: string;
  name: string;
  mimeType: string;
  position: number;
}
export interface Album {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  coverUrl: string | null;
  isDefault: boolean;
  items: AlbumItem[];
}
export interface Media {
  mimeType: string;
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
export type PatternShape = 'heart' | 'star' | 'dot';
export type SiteFont = 'default' | 'bubble-candy';
export interface SiteAppearance {
  /** Public site's complete frontend theme, independent of Admin and reader palettes. */
  themeId: string;
  font: SiteFont;
  fontSize: number;
  avatar: PatternShape;
  cover: PatternShape;
  background: PatternShape | 'none';
}
export function normalizeFontSize(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 80 &&
    value <= 150
    ? value
    : 100;
}
export const defaultAppearance: SiteAppearance = {
  themeId: 'default',
  font: 'default',
  fontSize: 100,
  avatar: 'heart',
  cover: 'dot',
  background: 'dot',
};
export interface Site extends LocalizedContent {
  title: string;
  description: string;
  authorBio: string;
  author: Pick<Author, 'displayName' | 'avatarUrl'>;
  commentsEnabled: boolean;
  appearance: SiteAppearance;
}
export interface SiteTranslation {
  locale: ContentLocale;
  title: string;
  description: string;
  authorBio: string;
}
export interface AdminSite {
  commentsEnabled: boolean;
  appearance: SiteAppearance;
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
export interface Settings {
  site: Site;
  homepage: Homepage;
}
export interface AdminSettings {
  site: AdminSite;
  homepage: AdminHomepage;
}
export const defaultSite: Site = {
  title: '梦桜',
  description: '记录生活，也记录每一次灵感。',
  author: {
    displayName: DEFAULT_OWNER_EMAIL.split('@')[0]!.replace(/^./u, (first) =>
      first.toUpperCase(),
    ),
    avatarUrl: null,
  },
  authorBio: '在这里，收藏日常的微光。',
  appearance: { ...defaultAppearance },
  commentsEnabled: true,
  contentLocale: 'zh',
};
export const defaultHomepage: Homepage = {
  coverUrl: '/sakura/images/default/hd.webp',
  focusMode: 'glitch-text',
  greeting: 'Hi, 梦桜!',
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

export type TimelineItem =
  | ({ kind: 'post' } & Pick<
      Post,
      | 'id'
      | 'slug'
      | 'coverUrl'
      | 'title'
      | 'excerpt'
      | 'publishedAt'
      | 'author'
      | 'contentLocale'
    >)
  | ({ kind: 'moment'; author: Author | null; title?: string | null } & Pick<
      Moment,
      'id' | 'content' | 'publishedAt' | 'contentLocale'
    >);
export interface Timeline {
  items: TimelineItem[];
  nextCursor: string | null;
}
