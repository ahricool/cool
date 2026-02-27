'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::page.page');

module.exports = {
  routes: [
    ...defaultRouter.routes,
    {
      method: 'GET',
      path: '/pages/slug/:slug',
      handler: 'page.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
