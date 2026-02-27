'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/hello',
      handler: 'hello.index',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
