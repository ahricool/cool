'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const DEFAULT_THEME_SETTINGS = {
  general: {
    themeSkin: '#fe9600',
    listType: 'imageflow',
  },
  hero: {
    enabled: true,
    backgroundImage: '',
    backgroundFilter: 'filter-grid',
    titleStyle: 'glitch-text',
    glitchText: 'Hi, Friend',
    intro: '',
    showSocials: true,
    fullScreen: true,
    wave: false,
    showScrollDown: true,
  },
  focus: {
    enabled: true,
    title: '聚焦',
    icon: 'fa:anchor',
    items: [],
  },
  footer: {
    logo: '/assets/images/footer/sakura.svg',
    icp: '',
    police: '',
    policeCode: '',
  },
  theme: {
    enableSwitcher: true,
    backgrounds: [
      { name: 'white', url: '', strategy: 'none', night: false, default: true },
      { name: 'sakura', url: '', strategy: 'none', night: false, default: false },
      { name: 'dark', url: '', strategy: 'cover', night: true, default: false },
    ],
  },
  author: {
    name: '',
    avatar: '',
    bio: '',
    email: '',
    location: '',
    backgroundImage: '',
  },
};

function toPlainArray(value) {
  return Array.isArray(value) ? value : [];
}

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNavigation(value) {
  return toPlainArray(value)
    .map((item) => ({
      label: toSafeString(item?.label),
      path: toSafeString(item?.path),
      external: Boolean(item?.external),
    }))
    .filter((item) => item.label && item.path);
}

function normalizeSocialLinks(value) {
  return toPlainArray(value)
    .map((item) => ({
      label: toSafeString(item?.label || item?.name),
      icon: toSafeString(item?.icon),
      url: toSafeString(item?.url),
      image: toSafeString(item?.image),
    }))
    .filter((item) => item.label && item.url);
}

function normalizeFriendLinks(value) {
  return toPlainArray(value)
    .map((item, index) => ({
      id: String(item?.id ?? index + 1),
      group: toSafeString(item?.group, '友情链接'),
      name: toSafeString(item?.name),
      url: toSafeString(item?.url),
      description: toSafeString(item?.description),
      logo: toSafeString(item?.logo),
    }))
    .filter((item) => item.name && item.url);
}

function normalizeThemeSettings(config) {
  const hero = { ...DEFAULT_THEME_SETTINGS.hero, ...(config.hero || {}) };
  const focus = {
    ...DEFAULT_THEME_SETTINGS.focus,
    ...(config.focus || {}),
    items: toPlainArray(config.focus?.items || config.focus?.features).map((item, index) => ({
      id: String(item?.id ?? index + 1),
      title: toSafeString(item?.title),
      description: toSafeString(item?.description),
      link: toSafeString(item?.link),
      image: toSafeString(item?.image),
    })),
  };

  const footer = { ...DEFAULT_THEME_SETTINGS.footer, ...(config.footer || {}) };
  const theme = {
    ...DEFAULT_THEME_SETTINGS.theme,
    ...(config.themeSettings || config.theme || {}),
    backgrounds: toPlainArray(config.themeSettings?.backgrounds || config.theme?.backgrounds)
      .map((item) => ({
        name: toSafeString(item?.name || item?.bg_name),
        url: toSafeString(item?.url || item?.bg_url),
        strategy: toSafeString(item?.strategy || item?.bg_img_strategy, 'none'),
        icon: toSafeString(item?.icon || item?.bg_icon),
        night: Boolean(item?.night ?? item?.bg_night),
        default: Boolean(item?.default ?? item?.bg_isdefault),
      }))
      .filter((item) => item.name),
  };

  if (theme.backgrounds.length === 0) {
    theme.backgrounds = DEFAULT_THEME_SETTINGS.theme.backgrounds;
  }

  const author = { ...DEFAULT_THEME_SETTINGS.author, ...(config.authorProfile || config.author || {}) };

  return {
    general: {
      ...DEFAULT_THEME_SETTINGS.general,
      ...(config.general || {}),
      themeSkin: toSafeString(config.general?.themeSkin || config.general?.theme_skin, DEFAULT_THEME_SETTINGS.general.themeSkin),
      listType: toSafeString(config.general?.listType || config.general?.post_list_style, DEFAULT_THEME_SETTINGS.general.listType),
    },
    hero,
    focus,
    footer,
    theme,
    author,
  };
}

function sortPublishedDesc(items) {
  return [...items].sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime());
}

function formatTag(tag, posts) {
  const count = posts.filter((post) => post.tags.some((item) => item.slug === tag.slug)).length;
  return {
    id: String(tag.id),
    documentId: String(tag.documentId ?? tag.id),
    name: toSafeString(tag.name),
    slug: toSafeString(tag.slug),
    count,
  };
}

function formatCategory(category, posts) {
  const count = posts.filter((post) => post.categories.some((item) => item.slug === category.slug)).length;
  return {
    id: String(category.id),
    documentId: String(category.documentId ?? category.id),
    name: toSafeString(category.name),
    slug: toSafeString(category.slug),
    count,
  };
}

function formatPostSummary(post) {
  const tags = toPlainArray(post.tags).map((tag) => ({
    id: String(tag.id),
    documentId: String(tag.documentId ?? tag.id),
    name: toSafeString(tag.name),
    slug: toSafeString(tag.slug),
  }));
  const categories = toPlainArray(post.categories).map((category) => ({
    id: String(category.id),
    documentId: String(category.documentId ?? category.id),
    name: toSafeString(category.name),
    slug: toSafeString(category.slug),
  }));

  return {
    id: String(post.id),
    documentId: String(post.documentId ?? post.id),
    title: toSafeString(post.title),
    slug: toSafeString(post.slug),
    excerpt: toSafeString(post.excerpt),
    cover: toSafeString(post.cover),
    author: post.author
      ? {
          id: String(post.author.id),
          name: toSafeString(post.author.username || post.author.name, 'Unknown'),
          avatar: toSafeString(post.author.avatar),
        }
      : { id: '', name: 'Unknown', avatar: '' },
    tags,
    categories,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt || post.createdAt,
    views: Number(post.views ?? 0),
    likes: Number(post.likes ?? 0),
  };
}

function formatPageSummary(page) {
  return {
    id: String(page.id),
    documentId: String(page.documentId ?? page.id),
    title: toSafeString(page.title),
    slug: toSafeString(page.slug),
    cover: toSafeString(page.cover),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

module.exports = createCoreController('api::site-config.site-config', ({ strapi }) => ({
  async bootstrap(ctx) {
    const config = (await strapi.db.query('api::site-config.site-config').findOne({})) || {};
    const themeSettings = normalizeThemeSettings(config);

    const postsRaw = await strapi.db.query('api::post.post').findMany({
      where: { publishedAt: { $notNull: true } },
      populate: ['author', 'tags', 'categories'],
    });
    const pagesRaw = await strapi.db.query('api::page.page').findMany({
      where: { publishedAt: { $notNull: true } },
    });
    const tagsRaw = await strapi.db.query('api::tag.tag').findMany();
    const categoriesRaw = await strapi.db.query('api::category.category').findMany();

    const posts = sortPublishedDesc(postsRaw.map(formatPostSummary));
    const pages = sortPublishedDesc(pagesRaw.map(formatPageSummary));
    const tags = tagsRaw.map((tag) => formatTag(tag, posts));
    const categories = categoriesRaw.map((category) => formatCategory(category, posts));

    const navigation = normalizeNavigation(config.navigation);
    const socialLinks = normalizeSocialLinks(config.socialLinks);
    const friendLinks = normalizeFriendLinks(config.friendLinks);

    ctx.body = {
      site: {
        title: toSafeString(config.title, 'My Blog'),
        subtitle: toSafeString(config.subtitle),
        description: toSafeString(config.description),
        logo: toSafeString(config.logo),
        favicon: toSafeString(config.favicon, '/favicon.ico'),
        url: toSafeString(config.url),
      },
      navigation: navigation.length > 0
        ? navigation
        : [
            { label: '首页', path: '/', external: false },
            { label: '归档', path: '/archive', external: false },
            { label: '友链', path: '/links', external: false },
            { label: '关于', path: '/author', external: false },
          ],
      socialLinks,
      noticeTitle: toSafeString(config.noticeTitle),
      theme: themeSettings,
      posts,
      pages,
      tags,
      categories,
      friendLinks,
    };
  },
}));
