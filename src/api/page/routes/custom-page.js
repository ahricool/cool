'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/public/pages/slug/:slug',
      handler: 'api::page.page.findPublicBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/pages/slug/:slug',
      handler: 'api::page.page.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
