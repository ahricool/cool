'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Serves the pre-built Vue frontend static files from ./Web/dist.
 * Falls back to index.html for any route not matching a real file
 * (required for Vue Router history mode).
 * API, admin, and upload routes are passed through to Strapi unchanged.
 */
module.exports = (config, { strapi }) => {
  const distDir = path.resolve(
    process.cwd(),
    config.distDir || process.env.FRONTEND_DIST_PATH || 'Web/dist'
  );

  strapi.log.info(`[serve-frontend] Serving frontend from: ${distDir}`);

  const serveFile = async (ctx, filePath) => {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('open', () => {
        ctx.type = path.extname(filePath) || '.html';
        ctx.body = stream;
        resolve();
      });
    });
  };

  const statFile = (filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile() ? stat : null;
    } catch {
      return null;
    }
  };

  return async (ctx, next) => {
    if (
      ctx.path.startsWith('/api') ||
      ctx.path.startsWith('/admin') ||
      ctx.path.startsWith('/uploads') ||
      ctx.path.startsWith('/_health')
    ) {
      return next();
    }

    const relativePath = ctx.path === '/' ? 'index.html' : ctx.path.replace(/^\//, '');
    // Guard against directory traversal
    const filePath = path.join(distDir, path.normalize(relativePath));
    if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
      return next();
    }

    const target = statFile(filePath)
      ? filePath
      : path.join(distDir, 'index.html');

    if (!statFile(target)) {
      return next();
    }

    try {
      await serveFile(ctx, target);
    } catch (err) {
      strapi.log.error(`[serve-frontend] Failed to serve ${target}: ${err.message}`);
      ctx.status = 500;
    }
  };
};
