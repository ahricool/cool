'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

module.exports = createCoreController('api::page.page', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.db.query('api::page.page').findOne({
      where: { slug, publishedAt: { $notNull: true } },
    });

    if (!entity) {
      return ctx.notFound('Page not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async findPublicBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.db.query('api::page.page').findOne({
      where: { slug, publishedAt: { $notNull: true } },
    });

    if (!entity) {
      return ctx.notFound('Page not found');
    }

    ctx.body = {
      data: {
        id: String(entity.id),
        documentId: String(entity.documentId ?? entity.id),
        title: toSafeString(entity.title),
        slug: toSafeString(entity.slug),
        content: toSafeString(entity.content),
        cover: toSafeString(entity.cover),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    };
  },
}));
