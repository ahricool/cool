'use strict';

const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves the built Vue SPA from public/app/.
 * - All paths starting with /api, /admin, /uploads, or /_health are passed through.
 * - Existing files in public/app are served directly.
 * - Everything else falls back to public/app/index.html for SPA client-side routing.
 */
module.exports = (config, { strapi }) => {
  const distDir = path.resolve(strapi.dirs.app.root, 'public', 'app');

  return async (ctx, next) => {
    const reqPath = ctx.path;

    // Pass through Strapi's own routes
    if (
      reqPath === '/api' ||
      reqPath.startsWith('/api/') ||
      reqPath.startsWith('/admin') ||
      reqPath === '/uploads' ||
      reqPath.startsWith('/uploads/') ||
      reqPath === '/_health'
    ) {
      return next();
    }

    // Resolve the target path and guard against path-traversal attacks
    const filePath = path.resolve(distDir, reqPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
      return next();
    }

    // Try to serve the exact file (async, non-blocking)
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        ctx.type = MIME_TYPES[ext] || 'application/octet-stream';
        ctx.body = fs.createReadStream(filePath);
        return;
      }
    } catch (_) {
      // file does not exist – fall through to SPA fallback
    }

    // SPA fallback: serve index.html so Vue Router can handle the route
    const indexPath = path.join(distDir, 'index.html');
    try {
      await fs.promises.access(indexPath, fs.constants.R_OK);
      ctx.type = 'text/html; charset=utf-8';
      ctx.body = fs.createReadStream(indexPath);
    } catch (_) {
      return next();
    }
  };
};
