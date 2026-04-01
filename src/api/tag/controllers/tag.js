'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tag.tag', ({ strapi }) => ({
  async withPostCount(item) {
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
  },

  async find(ctx) {
    const response = await super.find(ctx);
    response.data = await Promise.all(
      (response.data ?? []).map((item) => this.withPostCount(item))
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
    return this.withPostCount(this.transformResponse(sanitizedEntity).data).then((data) => ({ data }));
  },
}));
