/* global __dirname */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const request = require('supertest');
require('reflect-metadata');
const { Logger } = require('@nestjs/common');
const { createApp } = require('../dist/app');
const { readConfig } = require('../dist/config');
const { Database } = require('../dist/database');

before(() => {
  Logger.overrideLogger(false);
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1/cool_test';
  process.env.JWT_SECRET = 'proxy-test-secret-at-least-32-characters';
  process.env.NODE_ENV = 'test';
});

async function startApp(t, environment = 'test') {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });
  // These requests stop at DTO validation or the real ThrottlerGuard. No query
  // runs, so bypass only database startup; exercise the production app wiring.
  t.mock.method(Database.prototype, 'onModuleInit', async () => {});
  const app = await createApp();
  t.after(() => app.close());
  await app.init();
  return request(app.getHttpServer());
}

function login(http, forwardedFor, realIp = '203.0.113.99') {
  return http
    .post('/api/v1/admin/auth/login')
    .set('X-Forwarded-For', forwardedFor)
    .set('X-Real-IP', realIp)
    .send({});
}

test('configuration only requires database, signing secret and port', () => {
  assert.deepEqual(Object.keys(readConfig()).sort(), [
    'databaseUrl',
    'jwtSecret',
    'port',
  ]);
});

test('CORS is wildcard without credentialed origin reflection', async (t) => {
  const http = await startApp(t);
  for (const origin of [
    'https://other.test',
    'http://localhost:3001',
    'null',
  ]) {
    const response = await http
      .get('/api/openapi.json')
      .set('Origin', origin)
      .expect(200);
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(
      response.headers['access-control-allow-credentials'],
      undefined,
    );
    const preflight = await http
      .options('/api/v1/admin/auth/profile')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
      .expect(204);
    assert.equal(preflight.headers['access-control-allow-origin'], '*');
    assert.equal(
      preflight.headers['access-control-allow-credentials'],
      undefined,
    );
    assert.match(
      preflight.headers['access-control-allow-headers'],
      /x-csrf-token/,
    );
  }
});

test('login and setup reject browser simple form content types', async (t) => {
  const http = await startApp(t);
  for (const path of ['login', 'setup']) {
    for (const contentType of [
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data; boundary=test',
    ])
      await http
        .post(`/api/v1/admin/auth/${path}`)
        .set('Content-Type', contentType)
        .set('Origin', 'https://other.test')
        .set('Sec-Fetch-Site', 'cross-site')
        .send(
          '{"email":"other@example.test","password":"long-enough-password"}',
        )
        .expect(415);
    // Correct JSON reaches ordinary DTO validation with any Origin metadata.
    await http
      .post(`/api/v1/admin/auth/${path}`)
      .set('Origin', 'https://other.test')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({})
      .expect(400);
  }
});

test('direct mode ignores spoofed forwarding headers for login limits', async (t) => {
  const http = await startApp(t);
  for (let i = 1; i <= 5; i++)
    await login(http, `198.51.100.${i}`, `203.0.113.${i}`).expect(400);
  await login(http, '198.51.100.200', '203.0.113.200').expect(429);
});

test('production trusts one adjacent proxy for each client login quota', async (t) => {
  const http = await startApp(t, 'production');
  for (let i = 0; i < 5; i++) await login(http, '198.51.100.10').expect(400);
  await login(http, '198.51.100.10').expect(429);
  for (let i = 0; i < 5; i++) await login(http, '198.51.100.20').expect(400);
  await login(http, '198.51.100.20').expect(429);
  await login(http, '2001:db8:1::1').expect(400);
});

test('spoofed leading chain entries and X-Real-IP cannot reset a proxy quota', async (t) => {
  const http = await startApp(t, 'production');
  for (let i = 1; i <= 5; i++)
    await login(http, `203.0.113.${i}, 198.51.100.30`, `203.0.113.${i}`).expect(
      400,
    );
  await login(http, '203.0.113.200, 198.51.100.30').expect(429);
  await login(http, '198.51.100.40').expect(400);
});

test('all Nginx API locations replace client-supplied forwarding headers', () => {
  const config = readFileSync(
    join(__dirname, '../../../nginx/default.conf'),
    'utf8',
  );
  for (const location of [
    /location = \/api\/v1\/admin\/auth\/login \{([^}]+)\}/,
    /location = \/api\/v1\/admin\/auth\/setup \{([^}]+)\}/,
    /location \/api\/ \{([^}]+)\}/,
  ]) {
    const block = config.match(location)?.[1];
    assert.ok(block, 'All API proxy locations must be present');
    for (const directive of [
      'X-Forwarded-For $remote_addr',
      'Host $http_host',
      'X-Forwarded-Host $http_host',
      'X-Forwarded-Proto $scheme',
    ])
      assert.ok(block.includes(`proxy_set_header ${directive};`));
    assert.ok(!block.includes('$proxy_add_x_forwarded_for'));
  }
  const compose = readFileSync(
    join(__dirname, '../../../docker-compose.prod.yml'),
    'utf8',
  );
  assert.match(compose, /NODE_ENV: production/);
  const backend = compose.match(
    /\n {2}backend:\n([\s\S]*?)\n {2}frontend:/,
  )?.[1];
  assert.ok(backend);
  assert.doesNotMatch(backend, /\n\s+ports:/);
});
