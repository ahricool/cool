'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::category.category', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.db.query('api::category.category').findOne({
      where: { slug },
      populate: { posts: true },
    });

    if (!entity) {
      return ctx.notFound('Category not found');
    }

    entity.postCount = Array.isArray(entity.posts) ? entity.posts.length : 0;

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
