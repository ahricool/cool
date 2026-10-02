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
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = '1'.repeat(40);
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'cms-deployment-test-'));
  await mkdir(join(dir, 'scripts'));
  await mkdir(join(dir, 'deployment'));
  await mkdir(join(dir, 'bin'));
  for (const file of ['deploy.sh', 'scripts/compose.sh']) {
    await copyFile(resolve(file), join(dir, file));
    await chmod(join(dir, file), 0o755);
  }
  await writeFile(join(dir, '.env'), 'JWT_SECRET=fixture-only\n');
  await writeFile(join(dir, 'docker-compose.prod.yml'), 'services: {}\n');
  await writeFile(
    join(dir, 'deployment/current.yml'),
    'services: {backend: {image: previous:tag}}\n',
  );
  const log = join(dir, 'calls.jsonl');
  await writeFile(
    join(dir, 'bin/docker'),
    `#!/usr/bin/env node\nconst fs=require('node:fs');fs.appendFileSync(process.env.CMS_FAKE_LOG,JSON.stringify(process.argv.slice(2))+'\\n');if(process.env.CMS_FAIL_ROLLOUT==='1'&&process.argv.includes('--remove-orphans'))process.exit(1);\n`,
  );
  await writeFile(
    join(dir, 'bin/git'),
    `#!/usr/bin/env node\nif(process.argv[2]==='rev-parse')console.log('${sha}');\n`,
  );
  for (const tool of ['docker', 'git'])
    await chmod(join(dir, 'bin', tool), 0o755);
  const run = (script: string, args: string[] = [], extra = {}) =>
    spawnSync('bash', [script, ...args], {
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        CMS_FAKE_LOG: log,
        SKIP_BACKUP: '1',
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
        .map((line) => JSON.parse(line) as string[]),
  };
}

test('Compose selects the active image manifest outside the environment file', async () => {
  const f = await fixture();
  try {
    assert.equal(f.run('scripts/compose.sh', ['config', '--quiet']).status, 0);
    const [args] = await f.calls();
    assert.deepEqual(args, [
      'compose',
      '--env-file',
      '.env',
      '-f',
      'docker-compose.prod.yml',
      '-f',
      'deployment/current.yml',
      'config',
      '--quiet',
    ]);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('explicit local builds never pick a deployed release manifest', async () => {
  const f = await fixture();
  try {
    assert.equal(
      f.run('scripts/compose.sh', [
        '--images',
        'local',
        'build',
        'backend',
        'frontend',
      ]).status,
      0,
    );
    assert.deepEqual((await f.calls())[0], [
      'compose',
      '--env-file',
      '.env',
      '-f',
      'docker-compose.prod.yml',
      'build',
      'backend',
      'frontend',
    ]);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('missing explicit image manifests and invalid release SHAs fail closed', async () => {
  const f = await fixture();
  try {
    assert.equal(
      f.run('scripts/compose.sh', ['--images', 'missing.yml', 'up']).status,
      2,
    );
    assert.equal(f.run('deploy.sh', ['main']).status, 2);
    assert.equal(f.run('deploy.sh', [sha, 'extra']).status, 2);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('deployment pins every application service and promotes only healthy releases', async () => {
  const f = await fixture();
  try {
    const previous = await readFile(
      join(f.dir, 'deployment/current.yml'),
      'utf8',
    );
    const result = f.run('deploy.sh', [sha]);
    assert.equal(result.status, 0, result.stderr);
    const current = await readFile(
      join(f.dir, 'deployment/current.yml'),
      'utf8',
    );
    assert.equal(
      current,
      await readFile(join(f.dir, `deployment/sha-${sha}.yml`), 'utf8'),
    );
    assert.equal(
      await readFile(join(f.dir, 'deployment/previous.yml'), 'utf8'),
      previous,
    );
    assert.equal(
      (current.match(new RegExp(`cool-backend:sha-${sha}`, 'g')) ?? []).length,
      3,
    );
    assert.match(current, new RegExp(`cool-frontend:sha-${sha}`));
    const calls = await f.calls();
    assert(calls.every((args) => args.includes(`deployment/sha-${sha}.yml`)));
    assert.deepEqual(
      calls.at(-1)?.slice(-6),
      ['up', '-d', '--wait', '--remove-orphans', 'backend', 'frontend'].slice(
        -7,
      ),
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('failed rollout preserves the last healthy manifest for recovery', async () => {
  const f = await fixture();
  try {
    const before = await readFile(
      join(f.dir, 'deployment/current.yml'),
      'utf8',
    );
    assert.equal(
      f.run('deploy.sh', [sha], { CMS_FAIL_ROLLOUT: '1' }).status,
      1,
    );
    assert.equal(
      await readFile(join(f.dir, 'deployment/current.yml'), 'utf8'),
      before,
    );
    assert.match(
      await readFile(join(f.dir, `deployment/sha-${sha}.yml`), 'utf8'),
      /cool-frontend/,
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
