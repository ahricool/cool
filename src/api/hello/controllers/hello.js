'use strict';

/**
 * A set of functions called "actions" for `hello`
 */

module.exports = {
  // GET /api/hello
  async index(ctx) {
    ctx.body = { message: 'Hello World!' };
  },
};
