import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('both application images publish AMD64 and ARM64 under the existing tags', async () => {
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  const images = workflow.slice(workflow.indexOf('\n  images:'));
  assert.match(images, /service: backend\n\s+dockerfile: Dockerfile\n/);
  assert.match(
    images,
    /service: frontend\n\s+dockerfile: Dockerfile.frontend\n/,
  );
  assert.match(images, /platforms: linux\/amd64,linux\/arm64\n/);
  assert.match(
    images,
    /docker\/setup-qemu-action@v3\n\s+with:\n\s+platforms: arm64/,
  );
  assert(
    images.indexOf('setup-qemu-action') < images.indexOf('setup-buildx-action'),
  );
  assert.match(
    images,
    /images: ghcr.io\/\$\{\{ github.repository }}-\$\{\{ matrix.service }}/,
  );
  for (const tag of ['latest', 'main'])
    assert(images.includes(`type=raw,value=${tag},enable=`));
  assert.match(images, /type=sha,format=long/);
  assert.match(
    images,
    /cache-from: type=gha,scope=\$\{\{ matrix.service }}-multiarch/,
  );
  assert.match(
    images,
    /cache-to: type=gha,mode=max,scope=\$\{\{ matrix.service }}-multiarch/,
  );
  assert.match(images, /DIGEST: \$\{\{ steps.build.outputs.digest }}/);
  assert.match(images, /imagetools inspect "\$IMAGE@\$DIGEST" --raw/);
  assert.match(images, /contains\(\["linux\/amd64", "linux\/arm64"\]\)/);
});

test('backend native dependencies are installed and checked on the runtime platform', async () => {
  const dockerfile = await readFile('Dockerfile', 'utf8');
  assert.match(dockerfile, /^FROM node:24-bookworm-slim AS base$/m);
  assert.match(dockerfile, /^FROM base AS build$/m);
  assert.match(dockerfile, /^FROM base AS runtime$/m);
  assert.doesNotMatch(dockerfile, /^FROM --platform=/m);
  assert.doesNotMatch(dockerfile, /npm_config_(arch|platform)|--cpu=|--os=/);
  assert.match(dockerfile, /apt-get install .*openssl ca-certificates/);
  assert.match(dockerfile, /RUN npm ci --workspace @cool\/backend/);
  assert.match(dockerfile, /npm run db:generate.*npm prune --omit=dev/);
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/node_modules \.\/node_modules/,
  );
  const runtimeChecks = dockerfile.slice(dockerfile.indexOf('USER node'));
  assert.match(runtimeChecks, /require\('sharp'\).*\.webp\(\)\.toBuffer\(\)/);
  assert.match(
    runtimeChecks,
    /npm exec --workspace @cool\/backend -- prisma --version/,
  );

  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  for (const arch of ['x64', 'arm64']) {
    for (const name of ['sharp', 'sharp-libvips']) {
      const dependency =
        lock.packages[`node_modules/@img/${name}-linux-${arch}`];
      assert(dependency, `${name} must include Linux ${arch} binaries`);
      assert.deepEqual(dependency.cpu, [arch]);
      assert.deepEqual(dependency.os, ['linux']);
    }
  }
});

test('frontend copies only static output into a target-platform Nginx', async () => {
  const dockerfile = await readFile('Dockerfile.frontend', 'utf8');
  assert.match(
    dockerfile,
    /^FROM --platform=\$BUILDPLATFORM node:24-bookworm-slim AS build$/m,
  );
  assert.match(dockerfile, /^FROM nginx:1.28-alpine AS runtime$/m);
  const copiedArtifacts = dockerfile
    .split('\n')
    .filter((line) => line.startsWith('COPY --from='));
  assert.deepEqual(copiedArtifacts, [
    'COPY --from=build /app/apps/frontend/.output/public /usr/share/nginx/html',
  ]);
});

test('local native artifacts cannot override container builds or production architecture', async () => {
  const ignored = (await readFile('.dockerignore', 'utf8')).split('\n');
  for (const pattern of [
    '**/node_modules',
    '**/generated',
    '**/dist',
    '**/.output',
  ])
    assert(ignored.includes(pattern), `missing ignore rule: ${pattern}`);
  for (const file of ['docker-compose.prod.yml', 'docker-compose.local.yml']) {
    const compose = await readFile(file, 'utf8');
    assert.doesNotMatch(compose, /^\s+platform:/m);
  }
});
