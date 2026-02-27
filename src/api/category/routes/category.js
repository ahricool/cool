'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::category.category');

module.exports = {
  routes: [
    ...defaultRouter.routes,
    {
      method: 'GET',
      path: '/categories/by-slug/:slug',
      handler: 'category.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

