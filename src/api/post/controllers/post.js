'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toPlainArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPostDetail(post, adjacent = {}) {
  return {
    id: String(post.id),
    documentId: String(post.documentId ?? post.id),
    title: toSafeString(post.title),
    slug: toSafeString(post.slug),
    excerpt: toSafeString(post.excerpt),
    content: toSafeString(post.content),
    cover: toSafeString(post.cover),
    author: post.author
      ? {
          id: String(post.author.id),
          name: toSafeString(post.author.username || post.author.name, 'Unknown'),
          avatar: toSafeString(post.author.avatar),
        }
      : { id: '', name: 'Unknown', avatar: '' },
    tags: toPlainArray(post.tags).map((tag) => ({
      id: String(tag.id),
      documentId: String(tag.documentId ?? tag.id),
      name: toSafeString(tag.name),
      slug: toSafeString(tag.slug),
    })),
    categories: toPlainArray(post.categories).map((category) => ({
      id: String(category.id),
      documentId: String(category.documentId ?? category.id),
      name: toSafeString(category.name),
      slug: toSafeString(category.slug),
    })),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt || post.createdAt,
    views: Number(post.views ?? 0),
    likes: Number(post.likes ?? 0),
    previousPost: adjacent.previousPost ?? null,
    nextPost: adjacent.nextPost ?? null,
  };
}

module.exports = createCoreController('api::post.post', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    const { query } = ctx;

    const entity = await strapi.db.query('api::post.post').findOne({
      where: { slug, publishedAt: { $notNull: true } },
      populate: query.populate || ['tags', 'categories', 'author'],
    });

    if (!entity) {
      return ctx.notFound('Post not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async findPublicBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.db.query('api::post.post').findOne({
      where: { slug, publishedAt: { $notNull: true } },
      populate: ['author', 'tags', 'categories'],
    });

    if (!entity) {
      return ctx.notFound('Post not found');
    }

    const siblings = await strapi.db.query('api::post.post').findMany({
      where: { publishedAt: { $notNull: true } },
      select: ['id', 'documentId', 'title', 'slug', 'publishedAt', 'createdAt'],
      orderBy: { publishedAt: 'desc' },
    });

    const index = siblings.findIndex((item) => item.slug === slug);
    const previousPost = index > 0
      ? {
          title: toSafeString(siblings[index - 1].title),
          slug: toSafeString(siblings[index - 1].slug),
        }
      : null;
    const nextPost = index >= 0 && index < siblings.length - 1
      ? {
          title: toSafeString(siblings[index + 1].title),
          slug: toSafeString(siblings[index + 1].slug),
        }
      : null;

    ctx.body = {
      data: formatPostDetail(entity, { previousPost, nextPost }),
    };
  },
}));
