'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/site-config/bootstrap',
      handler: 'api::site-config.site-config.bootstrap',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
