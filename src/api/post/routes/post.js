'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::post.post');

module.exports = {
  routes: [
    ...defaultRouter.routes,
    {
      method: 'GET',
      path: '/posts/slug/:slug',
      handler: 'post.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
