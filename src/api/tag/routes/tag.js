'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::tag.tag');

module.exports = {
  routes: [
    ...defaultRouter.routes,
    {
      method: 'GET',
      path: '/tags/by-slug/:slug',
      handler: 'tag.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

