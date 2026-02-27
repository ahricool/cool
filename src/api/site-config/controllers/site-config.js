'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::site-config.site-config');
