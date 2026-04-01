'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/public/posts/slug/:slug',
      handler: 'api::post.post.findPublicBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
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
