'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tag.tag', ({ strapi }) => ({
  async find(ctx) {
    const response = await super.find(ctx);
    response.data = await Promise.all(
      (response.data ?? []).map(async (item) => {
        const postCount = await strapi.db.query('api::post.post').count({
          where: { tags: { id: item.id }, publishedAt: { $notNull: true } },
        });

        return {
          ...item,
          attributes: {
            ...item.attributes,
            postCount,
          },
        };
      })
    );

    return response;
  },

  async findBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.db.query('api::tag.tag').findOne({
      where: { slug },
    });

    if (!entity) {
      return ctx.notFound('Tag not found');
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    const response = this.transformResponse(sanitizedEntity);
    response.data.attributes.postCount = await strapi.db.query('api::post.post').count({
      where: { tags: { id: entity.id }, publishedAt: { $notNull: true } },
    });

    return response;
  },
}));
