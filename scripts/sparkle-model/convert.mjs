#!/usr/bin/env node
// Converts the official Sparkle MMD model (PMX + textures) into the compact GLB
// the welcome scene loads. Three r172+ dropped MMDLoader, so the PMX is read by
// three r171 inside headless Chromium, exported with GLTFExporter, then
// compressed with gltf-transform (Draco geometry, WebP textures).
//
//   npm run model:sparkle -- <folder containing 花火3.0.pmx> [output.glb]
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg) {
  console.error(
    'Usage: npm run model:sparkle -- <folder containing 花火3.0.pmx> [output.glb]',
  );
  process.exit(1);
}
const source = resolve(sourceArg);
const output = resolve(
  outputArg ?? join(root, 'apps/frontend/public/models/sparkle.glb'),
);
const three = join(root, 'node_modules/three-r171');
const mounts = { '/three/': three, '/source/': source };
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.tga': 'application/octet-stream',
  '.pmx': 'application/octet-stream',
};

const work = await mkdtemp(join(tmpdir(), 'sparkle-model-'));
const raw = join(work, 'sparkle-raw.glb');

// Serves the converter page, three r171 and the model folder; the page PUTs
// the exported GLB back to /save.
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (request.method === 'PUT' && path === '/save') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      await writeFile(raw, Buffer.concat(chunks));
      response.end('ok');
      return;
    }
    let file = path === '/' ? join(here, 'page.html') : undefined;
    for (const [prefix, base] of Object.entries(mounts))
      if (path.startsWith(prefix)) {
        file = normalize(join(base, path.slice(prefix.length)));
        if (!file.startsWith(base + sep)) file = undefined;
      }
    if (!file) throw new Error('not found');
    response.setHeader(
      'Content-Type',
      types[extname(file).toLowerCase()] ?? 'application/octet-stream',
    );
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const { port } = server.address();

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('console', (message) => console.log(`[page] ${message.text()}`));
  await page.goto(`http://127.0.0.1:${port}/`);
  const result = await page.waitForFunction(() => globalThis.converted, null, {
    timeout: 120_000,
  });
  const outcome = await result.jsonValue();
  if (outcome !== true) throw new Error(`Conversion failed: ${outcome}`);
} finally {
  await browser.close();
  server.close();
}

execFileSync(
  join(root, 'node_modules/.bin/gltf-transform'),
  [
    'optimize',
    raw,
    output,
    // Draco decodes to plain float positions. Quantised meshopt output skewed
    // the skin binding once bones moved.
    '--compress',
    'draco',
    '--texture-compress',
    'webp',
    '--texture-size',
    '1024',
    '--simplify',
    'false',
    '--palette',
    'false',
    '--flatten',
    'false',
    '--join',
    'false',
    '--instance',
    'false',
  ],
  { stdio: 'inherit' },
);
const { size } = await stat(output);
await rm(work, { recursive: true, force: true });
console.log(`Wrote ${output} (${(size / 1024 / 1024).toFixed(2)} MB)`);
