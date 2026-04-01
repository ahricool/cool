import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface NavItem {
  label: string;
  path: string;
  external: boolean;
}

export interface SocialLink {
  label: string;
  icon?: string;
  url: string;
  image?: string;
}

export interface TagSummary {
  id: string;
  documentId: string;
  name: string;
  slug: string;
  count: number;
}

export interface CategorySummary {
  id: string;
  documentId: string;
  name: string;
  slug: string;
  count: number;
}

export interface AuthorSummary {
  id: string;
  name: string;
  avatar?: string;
}

export interface PostSummary {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  cover?: string;
  author: AuthorSummary;
  tags: TagSummary[];
  categories: CategorySummary[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  views: number;
  likes: number;
}

export interface PostAdjacent {
  title: string;
  slug: string;
}

export interface PostDetail extends PostSummary {
  content: string;
  previousPost: PostAdjacent | null;
  nextPost: PostAdjacent | null;
}

export interface PageSummary {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  cover?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageDetail extends PageSummary {
  content: string;
}

export interface FriendLink {
  id: string;
  group: string;
  name: string;
  url: string;
  description: string;
  logo?: string;
}

export interface ThemeBackground {
  name: string;
  url?: string;
  strategy: string;
  icon?: string;
  night: boolean;
  default: boolean;
}

export interface ThemeData {
  general: {
    themeSkin: string;
    listType: string;
  };
  hero: {
    enabled: boolean;
    backgroundImage?: string;
    backgroundFilter: string;
    titleStyle: string;
    glitchText: string;
    intro?: string;
    showSocials: boolean;
    fullScreen: boolean;
    wave: boolean;
    showScrollDown: boolean;
    backgroundVideo?: boolean;
    backgroundVideoUrl?: string;
  };
  focus: {
    enabled: boolean;
    title: string;
    icon?: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      link: string;
      image?: string;
    }>;
  };
  footer: {
    logo?: string;
    icp?: string;
    police?: string;
    policeCode?: string;
  };
  theme: {
    enableSwitcher: boolean;
    backgrounds: ThemeBackground[];
  };
  author: {
    name: string;
    avatar?: string;
    bio?: string;
    email?: string;
    location?: string;
    backgroundImage?: string;
  };
}

export interface SiteMeta {
  title: string;
  subtitle?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  url?: string;
}

export interface BootstrapData {
  site: SiteMeta;
  navigation: NavItem[];
  socialLinks: SocialLink[];
  noticeTitle?: string;
  theme: ThemeData;
  posts: PostSummary[];
  pages: PageSummary[];
  tags: TagSummary[];
  categories: CategorySummary[];
  friendLinks: FriendLink[];
}

function ensureUrl(value?: string) {
  if (!value) {
    return '';
  }
  if (/^https?:\/\//.test(value) || value.startsWith('data:') || value.startsWith('/')) {
    return value;
  }
  return `/${value}`;
}

function normalizePost(post: PostSummary): PostSummary {
  return {
    ...post,
    cover: ensureUrl(post.cover),
    author: {
      ...post.author,
      avatar: ensureUrl(post.author?.avatar),
    },
    tags: (post.tags || []).map((tag) => ({ ...tag, count: Number(tag.count ?? 0) })),
    categories: (post.categories || []).map((category) => ({ ...category, count: Number(category.count ?? 0) })),
  };
}

function normalizePage(page: PageSummary): PageSummary {
  return {
    ...page,
    cover: ensureUrl(page.cover),
  };
}

export async function getBootstrap() {
  const response = await api.get<BootstrapData>('/site-config/bootstrap');
  return {
    ...response.data,
    site: {
      ...response.data.site,
      logo: ensureUrl(response.data.site.logo),
      favicon: ensureUrl(response.data.site.favicon),
    },
    theme: {
      ...response.data.theme,
      hero: {
        ...response.data.theme.hero,
        backgroundImage: ensureUrl(response.data.theme.hero.backgroundImage),
        backgroundVideoUrl: ensureUrl(response.data.theme.hero.backgroundVideoUrl),
      },
      focus: {
        ...response.data.theme.focus,
        items: (response.data.theme.focus.items || []).map((item) => ({ ...item, image: ensureUrl(item.image) })),
      },
      footer: {
        ...response.data.theme.footer,
        logo: ensureUrl(response.data.theme.footer.logo),
      },
      author: {
        ...response.data.theme.author,
        avatar: ensureUrl(response.data.theme.author.avatar),
        backgroundImage: ensureUrl(response.data.theme.author.backgroundImage),
      },
      theme: {
        ...response.data.theme.theme,
        backgrounds: (response.data.theme.theme.backgrounds || []).map((item) => ({ ...item, url: ensureUrl(item.url) })),
      },
    },
    posts: (response.data.posts || []).map(normalizePost),
    pages: (response.data.pages || []).map(normalizePage),
    friendLinks: (response.data.friendLinks || []).map((item) => ({ ...item, logo: ensureUrl(item.logo) })),
    socialLinks: (response.data.socialLinks || []).map((item) => ({ ...item, image: ensureUrl(item.image) })),
  };
}

export async function getPostBySlug(slug: string) {
  const response = await api.get<{ data: PostDetail }>(`/public/posts/slug/${slug}`);
  return normalizePost(response.data.data) as PostDetail;
}

export async function getPageBySlug(slug: string) {
  const response = await api.get<{ data: PageDetail }>(`/public/pages/slug/${slug}`);
  return normalizePage(response.data.data) as PageDetail;
}
