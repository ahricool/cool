'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

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
}));
