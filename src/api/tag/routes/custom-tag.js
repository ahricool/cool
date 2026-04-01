'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/tags/by-slug/:slug',
      handler: 'api::tag.tag.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
