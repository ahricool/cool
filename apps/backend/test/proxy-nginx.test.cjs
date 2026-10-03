/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { request } = require('node:http');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
require('reflect-metadata');
const { Logger } = require('@nestjs/common');
const { createApp } = require('../dist/app');
const { Database } = require('../dist/database');

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function send(
  port,
  client,
  path,
  method = 'GET',
  forged = '203.0.113.99',
  host = 'cool.test',
) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        localAddress: client,
        agent: false,
        headers: {
          Host: host,
          'Content-Type': 'application/json',
          'X-Forwarded-For': `${forged}, 198.51.100.99`,
          'X-Real-IP': forged,
          'X-Forwarded-Host': 'attacker.test',
          'X-Forwarded-Proto': 'https',
        },
      },
      (res) => {
        res.resume();
        res.on('error', reject);
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers }),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(2000, () =>
      req.destroy(new Error('Ingress request timed out')),
    );
    req.end(method === 'POST' ? '{}' : undefined);
  });
}

function assertBoundary(response, status, client) {
  assert.equal(response.status, status);
  assert.equal(response.headers['x-test-client-ip'], client);
  assert.equal(response.headers['x-test-forwarded-for'], client);
  assert.equal(response.headers['x-test-real-ip'], client);
  assert.equal(response.headers['x-test-hostname'], 'cool.test');
  assert.equal(response.headers['x-test-protocol'], 'http');
}

test(
  'real Nginx isolates client quotas and overwrites forged identity headers',
  { skip: process.env.COOL_NGINX_TEST !== '1', timeout: 30000 },
  async (t) => {
    Logger.overrideLogger(false);
    process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1/cool_test';
    process.env.JWT_SECRET = 'nginx-test-secret-at-least-32-characters';
    process.env.NODE_ENV = 'production';
    // Only bypass database startup. Real routes, validation, auth and throttling
    // run; invalid DTOs and missing credentials prevent database queries.
    t.mock.method(Database.prototype, 'onModuleInit', async () => {});
    const directory = mkdtempSync(join(tmpdir(), 'cool-nginx-test-'));
    let app, nginx, closed;
    let output = '';
    t.after(async () => {
      if (nginx && nginx.exitCode === null && nginx.signalCode === null) {
        nginx.kill('SIGTERM');
        await Promise.race([closed, delay(2000)]);
        if (nginx.exitCode === null && nginx.signalCode === null)
          nginx.kill('SIGKILL');
      }
      if (closed) await closed;
      if (app) await app.close();
      rmSync(directory, { recursive: true, force: true });
      if (output) t.diagnostic(output);
    });
    app = await createApp();
    // Observe what the real proxy delivers without replacing app behavior.
    app.use((req, res, next) => {
      res.setHeader('X-Test-Client-IP', req.ip);
      res.setHeader(
        'X-Test-Forwarded-For',
        req.headers['x-forwarded-for'] ?? '',
      );
      res.setHeader('X-Test-Real-IP', req.headers['x-real-ip'] ?? '');
      res.setHeader('X-Test-Hostname', req.hostname);
      res.setHeader('X-Test-Host', req.headers.host);
      res.setHeader('X-Test-Forwarded-Host', req.headers['x-forwarded-host']);
      res.setHeader('X-Test-Protocol', req.protocol);
      next();
    });
    await app.listen(0, '127.0.0.1');
    const backendPort = app.getHttpServer().address().port;
    const port = await unusedPort();
    let ingress = readFileSync(
      join(__dirname, '../../../nginx/default.conf'),
      'utf8',
    );
    // Keep production locations, rate limits and headers intact. Replace only
    // Docker-specific addressing and the privileged listener for this harness.
    for (const [from, to] of [
      ['listen 80;', `listen 127.0.0.1:${port};`],
      ['resolver 127.0.0.11 valid=10s ipv6=off;', ''],
      ['http://backend:3000', `http://127.0.0.1:${backendPort}`],
    ]) {
      assert.ok(ingress.includes(from), `Production config changed: ${from}`);
      ingress = ingress.replace(from, to);
    }
    const config = join(directory, 'nginx.conf');
    writeFileSync(
      config,
      `pid ${directory}/nginx.pid;
error_log stderr warn;
events { worker_connections 128; }
http {
  access_log off;
  client_body_temp_path ${directory}/client;
  proxy_temp_path ${directory}/proxy;
  fastcgi_temp_path ${directory}/fastcgi;
  uwsgi_temp_path ${directory}/uwsgi;
  scgi_temp_path ${directory}/scgi;
  ${ingress}
}
`,
    );
    nginx = spawn(
      process.env.COOL_NGINX_BIN || 'nginx',
      ['-p', directory, '-c', config, '-g', 'daemon off; master_process off;'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let startupError;
    nginx.on('error', (error) => {
      startupError = error;
    });
    nginx.stdout.on('data', (chunk) => (output += chunk));
    nginx.stderr.on('data', (chunk) => (output += chunk));
    closed = new Promise((resolve) => nginx.once('close', resolve));
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (startupError) throw startupError;
      assert.equal(
        nginx.exitCode,
        null,
        `Nginx exited during startup: ${output}`,
      );
      try {
        ready =
          (await send(port, '127.0.0.2', '/api/openapi.json')).status === 200;
      } catch {
        // The process may not have bound its listener yet.
      }
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, `Nginx did not become ready: ${output}`);

    await t.test(
      'Admin slash redirect preserves the external origin',
      async () => {
        const response = await send(
          port,
          '127.0.0.2',
          '/admin',
          'GET',
          '203.0.113.99',
          'cool.test:43210',
        );
        assert.equal(response.status, 301);
        assert.equal(response.headers.location, '/admin/');
        for (const origin of [
          'http://cool.test:43210',
          'https://cool.test:43210',
        ])
          assert.equal(
            new URL(response.headers.location, origin).href,
            `${origin}/admin/`,
          );
      },
    );

    await t.test(
      'API forwarding preserves the external host and port',
      async () => {
        const response = await send(
          port,
          '127.0.0.6',
          '/api/v1/admin/auth/me',
          'GET',
          '203.0.113.99',
          'cool.test:43210',
        );
        assert.equal(response.status, 401);
        assert.equal(response.headers['x-test-host'], 'cool.test:43210');
        assert.equal(
          response.headers['x-test-forwarded-host'],
          'cool.test:43210',
        );
      },
    );
    await t.test(
      'initial setup has matching per-client rate limits',
      async () => {
        for (const client of ['127.0.0.4', '127.0.0.5']) {
          for (let i = 0; i < 5; i++) {
            const response = await send(
              port,
              client,
              '/api/v1/admin/auth/setup',
              'POST',
            );
            assertBoundary(response, 400, client);
            assert.equal(response.headers['x-ratelimit-limit'], '5');
          }
          assertBoundary(
            await send(port, client, '/api/v1/admin/auth/setup', 'POST'),
            429,
            client,
          );
        }
      },
    );

    await t.test(
      'both clients get a full login quota despite forged headers',
      async () => {
        for (const client of ['127.0.0.2', '127.0.0.3']) {
          for (let i = 0; i < 5; i++) {
            const response = await send(
              port,
              client,
              '/api/v1/admin/auth/login',
              'POST',
              `203.0.113.${i + 1}`,
            );
            assertBoundary(response, 400, client);
            assert.equal(response.headers['x-ratelimit-limit'], '5');
          }
          // Nginx permits its initial request plus burst=5. The sixth request
          // reaches Nest, proving the backend quota also survives header spoofing.
          assertBoundary(
            await send(port, client, '/api/v1/admin/auth/login', 'POST'),
            429,
            client,
          );
        }
      },
    );

    await t.test(
      'generic API routes isolate quotas and reject anonymous admin access',
      async () => {
        for (const client of ['127.0.0.2', '127.0.0.3']) {
          assertBoundary(
            await send(port, client, '/api/v1/admin/auth/me'),
            401,
            client,
          );
          for (let i = 0; i < 120; i++) {
            const response = await send(
              port,
              client,
              '/api/v1/public/posts?page=0',
              'GET',
              `203.0.113.${(i % 250) + 1}`,
            );
            assertBoundary(response, 400, client);
            assert.equal(response.headers['x-ratelimit-limit'], '120');
          }
          assertBoundary(
            await send(port, client, '/api/v1/public/posts?page=0'),
            429,
            client,
          );
        }
      },
    );
  },
);
