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
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1/cms_test';
  process.env.JWT_SECRET = 'proxy-test-secret-at-least-32-characters';
  process.env.NODE_ENV = 'test';
  delete process.env.CORS_ORIGINS;
});

function setTrust(t, value) {
  const previous = process.env.TRUST_PROXY_HOPS;
  if (value === undefined) delete process.env.TRUST_PROXY_HOPS;
  else process.env.TRUST_PROXY_HOPS = value;
  t.after(() => {
    if (previous === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = previous;
  });
}

async function startApp(t, trustProxyHops) {
  setTrust(t, trustProxyHops);
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

test('proxy trust defaults to direct and accepts only zero or one hop', (t) => {
  setTrust(t, undefined);
  assert.equal(readConfig().trustProxyHops, 0);
  for (const value of ['0', '1']) {
    process.env.TRUST_PROXY_HOPS = value;
    assert.equal(readConfig().trustProxyHops, Number(value));
  }
  for (const value of ['', 'true', 'false', '2', '-1', '1.5', 'loopback']) {
    process.env.TRUST_PROXY_HOPS = value;
    assert.throws(() => readConfig(), /TRUST_PROXY_HOPS/);
  }
});

test('direct mode ignores spoofed forwarding headers for login limits', async (t) => {
  const http = await startApp(t, undefined);
  for (let i = 1; i <= 5; i++)
    await login(http, `198.51.100.${i}`, `203.0.113.${i}`).expect(400);
  await login(http, '198.51.100.200', '203.0.113.200').expect(429);
});

test('a single proxy gives each forwarded client a separate login quota', async (t) => {
  const http = await startApp(t, '1');
  for (let i = 0; i < 5; i++) await login(http, '198.51.100.10').expect(400);
  await login(http, '198.51.100.10').expect(429);
  for (let i = 0; i < 5; i++) await login(http, '198.51.100.20').expect(400);
  await login(http, '198.51.100.20').expect(429);
  await login(http, '2001:db8:1::1').expect(400);
});

test('spoofed leading chain entries and X-Real-IP cannot reset a proxy quota', async (t) => {
  const http = await startApp(t, '1');
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
  assert.match(compose, /TRUST_PROXY_HOPS: '1'/);
});
