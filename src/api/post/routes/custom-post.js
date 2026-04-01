'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/posts/slug/:slug',
      handler: 'api::post.post.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
