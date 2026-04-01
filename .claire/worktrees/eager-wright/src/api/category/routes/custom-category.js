'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/categories/by-slug/:slug',
      handler: 'api::category.category.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
