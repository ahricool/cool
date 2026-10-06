// Disposable static SPA server; no backend, database or existing service.
/* global process, URL */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(
  process.env.THEME_STATIC_ROOT ?? 'apps/frontend/.output/public',
);
const port = Number(process.env.THEME_TEST_PORT ?? 43871);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://127.0.0.1').pathname,
    );
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep))
      throw new Error('Invalid path');
    let data;
    let extension = extname(file);
    try {
      data = await readFile(file);
    } catch {
      if (extension) {
        response.writeHead(404).end();
        return;
      }
      data = await readFile(resolve(root, 'index.html'));
      extension = '.html';
    }
    response.writeHead(200, {
      'Content-Type': types[extension] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(data);
  } catch {
    response.writeHead(400).end();
  }
}).listen(port, '127.0.0.1');
