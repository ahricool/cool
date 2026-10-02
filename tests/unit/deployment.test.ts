import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  copyFile,
  writeFile,
  readFile,
  rm,
  chmod,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = '1'.repeat(40);
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'cms-deployment-test-'));
  for (const name of ['scripts', 'deployment', 'bin'])
    await mkdir(join(dir, name));
  for (const file of [
    'deploy.sh',
    'scripts/compose.sh',
    'scripts/build.sh',
    'docker-compose.prod.yml',
    'docker-compose.local.yml',
  ]) {
    await copyFile(resolve(file), join(dir, file));
    if (file.endsWith('.sh')) await chmod(join(dir, file), 0o755);
  }
  await writeFile(join(dir, '.env'), 'JWT_SECRET=fixture-only\n');
  // Leftovers from the old deployment flow must not override fixed latest tags.
  await writeFile(
    join(dir, 'deployment/current.yml'),
    'services: {backend: {image: previous:tag}}\n',
  );
  const log = join(dir, 'calls.jsonl');
  await writeFile(log, '');
  const record = `const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.CMS_FAKE_LOG,JSON.stringify([TOOL,...args])+'\\n');`;
  await writeFile(
    join(dir, 'bin/docker'),
    `#!/usr/bin/env node
${record.replace('TOOL', "'docker'")}
if(process.env.CMS_FAIL && args.join(' ').includes(process.env.CMS_FAIL)) process.exit(1);
if(args.includes('ps') && process.env.CMS_RUNNING==='1') console.log('running-backend');
if(args[0]==='image' && args[1]==='inspect') {
  console.log(args.at(-1).includes('frontend') ? process.env.CMS_FRONTEND_REVISION : process.env.CMS_BACKEND_REVISION);
}
`,
  );
  await writeFile(
    join(dir, 'bin/git'),
    `#!/usr/bin/env node
${record.replace('TOOL', "'git'")}
if(process.env.CMS_GIT_FAIL===args[0]) process.exit(1);
if(args[0]==='rev-parse') console.log('${sha}');
if(args[0]==='status' && process.env.CMS_DIRTY==='1') console.log(' M deploy.sh');
`,
  );
  await writeFile(
    join(dir, 'backup.sh'),
    `#!/usr/bin/env node
${record.replace('TOOL', "'backup'")}
if(process.env.CMS_FAIL==='backup') process.exit(1);
`,
  );
  for (const tool of ['bin/docker', 'bin/git', 'backup.sh'])
    await chmod(join(dir, tool), 0o755);
  const run = (script: string, args: string[] = [], extra = {}) =>
    spawnSync('bash', [script, ...args], {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        CMS_ENV_FILE: '.env',
        CMS_FAKE_LOG: log,
        CMS_BACKEND_REVISION: sha,
        CMS_FRONTEND_REVISION: sha,
        SKIP_BACKUP: '0',
        ...extra,
      },
      encoding: 'utf8',
    });
  return {
    dir,
    run,
    calls: async () =>
      (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as string[]),
  };
}

const compose = (...args: string[]) => [
  'docker',
  'compose',
  '--env-file',
  '.env',
  '-f',
  'docker-compose.prod.yml',
  ...args,
];

test('production Compose fixes latest image names and CI publishes latest', async () => {
  const prod = await readFile('docker-compose.prod.yml', 'utf8');
  assert.match(prod, /image: ghcr\.io\/ahricool\/cool-backend:latest/);
  assert.match(prod, /image: ghcr\.io\/ahricool\/cool-frontend:latest/);
  assert.doesNotMatch(prod, /image:.*\$\{/);
  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  assert.match(
    workflow,
    /type=raw,value=latest,enable=\$\{\{ github.event_name == 'push' }}/,
  );
});

test('normal Compose ignores previous image manifests and honors runtime env file', async () => {
  const f = await fixture();
  try {
    const envFile = join(f.dir, 'runtime.env');
    await writeFile(envFile, 'JWT_SECRET=fixture-runtime-only\n');
    const result = f.run('scripts/compose.sh', ['config', '--quiet'], {
      CMS_ENV_FILE: envFile,
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const expected = compose('config', '--quiet');
    expected[3] = envFile;
    assert.deepEqual(await f.calls(), [expected]);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('explicit local builds do not overwrite published latest image tags', async () => {
  const f = await fixture();
  try {
    assert.equal(f.run('scripts/build.sh').status, 0);
    assert.deepEqual(await f.calls(), [
      compose('-f', 'docker-compose.local.yml', 'build', 'backend', 'frontend'),
    ]);
    const local = await readFile('docker-compose.local.yml', 'utf8');
    assert.equal((local.match(/image: cool-backend:local/g) ?? []).length, 3);
    assert.match(local, /image: cool-frontend:local/);
    assert.doesNotMatch(local, /image:.*:latest/);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('missing explicit image overrides fail closed', async () => {
  const f = await fixture();
  try {
    assert.equal(
      f.run('scripts/compose.sh', ['--images', 'missing.yml', 'up']).status,
      2,
    );
    assert.equal(f.run('scripts/compose.sh', ['--images']).status, 2);
    assert.deepEqual(await f.calls(), []);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('no-argument deployment updates main, pulls latest, backs up, migrates and waits for health', async () => {
  const f = await fixture();
  try {
    const result = f.run('deploy.sh');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Deployment ready \\(${sha}\\)`));
    assert.deepEqual(await f.calls(), [
      ['git', 'status', '--porcelain'],
      ['git', 'checkout', 'main'],
      ['git', 'pull', '--ff-only', 'origin', 'main'],
      ['git', 'rev-parse', 'HEAD'],
      compose('config', '--quiet'),
      compose('pull', 'backend', 'frontend', 'database'),
      [
        'docker',
        'image',
        'inspect',
        '--format',
        '{{ index .Config.Labels "org.opencontainers.image.revision" }}',
        'ghcr.io/ahricool/cool-backend:latest',
      ],
      [
        'docker',
        'image',
        'inspect',
        '--format',
        '{{ index .Config.Labels "org.opencontainers.image.revision" }}',
        'ghcr.io/ahricool/cool-frontend:latest',
      ],
      compose(
        'up',
        '-d',
        '--wait',
        '--no-build',
        '--pull',
        'never',
        'database',
      ),
      ['backup'],
      compose('run', '--rm', '--no-deps', '--pull', 'never', 'migrate'),
      compose('run', '--rm', '--no-deps', '--pull', 'never', 'seed'),
      compose(
        'up',
        '-d',
        '--wait',
        '--no-build',
        '--pull',
        'never',
        '--remove-orphans',
        'backend',
        'frontend',
      ),
    ]);
    assert.deepEqual(await readdir(join(f.dir, 'deployment')), ['current.yml']);
    assert.match(
      await readFile(join(f.dir, 'deployment/current.yml'), 'utf8'),
      /previous:tag/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('Compose command shortcut does not update or deploy', async () => {
  const f = await fixture();
  try {
    assert.equal(
      f.run('deploy.sh', ['logs', '--tail=100', 'backend']).status,
      0,
    );
    assert.deepEqual(await f.calls(), [
      compose('logs', '--tail=100', 'backend'),
    ]);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

for (const extra of [
  { CMS_DIRTY: '1' },
  { CMS_GIT_FAIL: 'checkout' },
  { CMS_GIT_FAIL: 'pull' },
  { CMS_FAIL: 'config --quiet' },
  { CMS_FAIL: 'pull backend frontend database' },
  { CMS_FAIL: 'image inspect' },
  { CMS_FRONTEND_REVISION: '2'.repeat(40) },
  {
    CMS_BACKEND_REVISION: '2'.repeat(40),
    CMS_FRONTEND_REVISION: '2'.repeat(40),
  },
  { CMS_BACKEND_REVISION: '<no value>' },
  { CMS_BACKEND_REVISION: '', CMS_FRONTEND_REVISION: '' },
]) {
  test(`preflight failure leaves containers and data untouched: ${JSON.stringify(extra)}`, async () => {
    const f = await fixture();
    try {
      const result = f.run('deploy.sh', [], extra);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /Deployment ready/);
      const calls = await f.calls();
      assert(
        !calls.some(
          (args) =>
            args[0] === 'backup' || args.includes('up') || args.includes('run'),
        ),
      );
      if ('CMS_DIRTY' in extra || 'CMS_GIT_FAIL' in extra)
        assert(!calls.some((args) => args[0] === 'docker'));
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  });
}

for (const [failure, forbidden] of [
  ['never database', 'backup'],
  ['backup', 'migrate'],
  ['never migrate', 'seed'],
  ['never seed', '--remove-orphans'],
  ['--remove-orphans', 'Deployment ready'],
]) {
  test(`deployment stops and reports failure at ${failure}`, async () => {
    const f = await fixture();
    try {
      const result = f.run('deploy.sh', [], { CMS_FAIL: failure });
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /Deployment ready/);
      assert(!(await f.calls()).some((args) => args.includes(forbidden)));
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  });
}

test('backup is skipped only when explicitly requested', async () => {
  const f = await fixture();
  try {
    const result = f.run('deploy.sh', [], { SKIP_BACKUP: '1' });
    assert.equal(result.status, 0, result.stderr);
    assert(!(await f.calls()).some((args) => args[0] === 'backup'));
    assert((await f.calls()).some((args) => args.includes('migrate')));
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('real backup preserves writer stop/resume without repulling checked latest', async () => {
  const f = await fixture();
  try {
    await copyFile(resolve('backup.sh'), join(f.dir, 'backup.sh'));
    const result = f.run('backup.sh', [], { CMS_RUNNING: '1' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Consistent backup saved/);
    const calls = await f.calls();
    assert.deepEqual(
      calls[0],
      compose('ps', '--status', 'running', '-q', 'backend'),
    );
    assert.deepEqual(calls[1], compose('stop', 'backend'));
    assert(
      calls[2].includes('pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'),
    );
    assert.deepEqual(
      calls[3],
      compose(
        'run',
        '--rm',
        '--no-deps',
        '--pull',
        'never',
        '-T',
        '--entrypoint',
        'tar',
        'backend',
        '-czf',
        '-',
        '-C',
        '/app/data',
        'uploads',
      ),
    );
    assert.deepEqual(calls[4], compose('start', 'backend'));
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
