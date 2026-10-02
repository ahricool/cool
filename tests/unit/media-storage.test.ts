import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  copyFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve('.');
const mediaModule = join(root, 'apps/backend/src/media-root.ts');

for (const cwd of [root, join(root, 'apps/backend'), tmpdir()]) {
  for (const [setting, expected] of [
    [undefined, join(root, 'data')],
    ['', join(root, 'data')],
    ['./data', join(root, 'data')],
    ['custom-media', join(root, 'custom-media')],
    ['/app/data', '/app/data'],
  ]) {
    test(`media directory is rooted in the project: cwd=${cwd}, setting=${setting}`, () => {
      const env = { ...process.env };
      delete env.MEDIA_ROOT;
      if (setting !== undefined) env.MEDIA_ROOT = setting;
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '-e',
          `process.chdir(${JSON.stringify(cwd)}); process.stdout.write(require(${JSON.stringify(mediaModule)}).mediaRoot())`,
        ],
        { cwd: root, env, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, expected);
    });
  }
}

test('production uses a media bind mount and keeps a namespaced database volume', async () => {
  const prod = await readFile('docker-compose.prod.yml', 'utf8');
  assert.match(prod, /source: \$\{MEDIA_ROOT:-\.\/data\}/);
  assert.match(prod, /type: bind/);
  assert.match(prod, /target: \/app\/data/);
  assert.match(prod, /MEDIA_ROOT: \/app\/data\n/);
  assert.match(prod, /postgres_data:\/var\/lib\/postgresql\/data/);
  assert.match(prod, /\nvolumes:\n {2}postgres_data:\s*$/);
  assert.doesNotMatch(prod, /media_data|\/app\/data\/uploads/);
  assert.match(prod, /media-init:[\s\S]*?profiles: \[tools\]/);
  assert.match(
    prod,
    /command: \['chown node:node \/app\/data && chmod 0750 \/app\/data'\]/,
  );
  assert.doesNotMatch(prod, /chown -R|chmod 777/);
  const dockerfile = await readFile('Dockerfile', 'utf8');
  assert.match(dockerfile, /MEDIA_ROOT=\/app\/data\n/);
  assert.match(dockerfile, /^USER node$/m);
  for (const file of ['.gitignore', '.dockerignore', '.prettierignore'])
    assert.match(await readFile(file, 'utf8'), /^\/?data\/?$/m);
});

for (const failure of ['config', 'pg_dump']) {
  test(`smoke ${failure} failure isolates media and backups from ambient user paths`, async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'cool-media-smoke-test-'));
    try {
      await mkdir(join(fixture, 'scripts'));
      await mkdir(join(fixture, 'bin'));
      await mkdir(join(fixture, 'user-media'));
      await mkdir(join(fixture, 'user-backups'));
      const savedBackup = join(fixture, 'user-backups', 'keep.txt');
      await writeFile(savedBackup, 'existing user backup');
      const sentinel = join(fixture, 'user-media', 'never-touch.webp');
      await writeFile(sentinel, 'existing user data');
      for (const file of [
        'scripts/compose-smoke.sh',
        'scripts/compose.sh',
        'scripts/build.sh',
        'scripts/backup-retention.sh',
        'backup.sh',
        'docker-compose.prod.yml',
      ]) {
        await copyFile(file, join(fixture, file));
      }
      const log = join(fixture, 'docker-calls.jsonl');
      await writeFile(
        join(fixture, 'bin/docker'),
        `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.COOL_TEST_LOG, JSON.stringify({args, media: process.env.MEDIA_ROOT, backupRoot: process.env.COOL_BACKUP_ROOT, project: process.env.COMPOSE_PROJECT_NAME}) + '\\n');
if (args[0] === 'context' && args[1] === 'show') console.log('test');
if (args[0] === 'context' && args[1] === 'inspect') console.log('unix:///test-only-docker.sock');
if (args.some(arg => arg.includes(process.env.COOL_TEST_FAIL))) process.exit(23);
`,
        { mode: 0o755 },
      );
      await writeFile(join(fixture, 'bin/git'), '#!/bin/sh\necho fixture\n', {
        mode: 0o755,
      });
      const result = spawnSync('bash', ['scripts/compose-smoke.sh'], {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `${join(fixture, 'bin')}:${process.env.PATH}`,
          COOL_TEST_LOG: log,
          COOL_TEST_FAIL: failure,
          DOCKER_CONTEXT: 'fixture',
          COOL_BACKUP_ROOT: join(fixture, 'user-backups'),
          MEDIA_ROOT: join(fixture, 'user-media'),
        },
      });
      assert.notEqual(result.status, 0, result.stdout);
      assert.equal(await readFile(sentinel, 'utf8'), 'existing user data');
      assert.equal(await readFile(savedBackup, 'utf8'), 'existing user backup');
      const calls = (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map(
          (line) =>
            JSON.parse(line) as {
              args: string[];
              media?: string;
              backupRoot?: string;
              project?: string;
            },
        )
        .filter(
          ({ args }) => args[0] === 'compose' && !args.includes('version'),
        );
      assert(calls.length > 0);
      const paths = new Set<string>();
      for (const { args, media, project: inheritedProject } of calls) {
        assert(media);
        assert(media.startsWith(join(fixture, 'test-results/.compose-smoke.')));
        const project = args.includes('-p')
          ? args[args.indexOf('-p') + 1]
          : inheritedProject;
        assert(project?.endsWith('-source') || project?.endsWith('-restore'));
        assert(
          media.endsWith(
            project.endsWith('-source') ? '/source-media' : '/restore-media',
          ),
        );
        paths.add(media);
      }
      assert.equal(paths.size, 2);
      if (failure === 'pg_dump') {
        const dump = calls.find(({ args }) =>
          args.some((arg) => arg.includes('pg_dump')),
        );
        assert(dump?.backupRoot);
        assert(
          dump.backupRoot.startsWith(
            join(fixture, 'test-results/.compose-smoke.'),
          ),
        );
        assert(dump.backupRoot.endsWith('/backups'));
      }
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
}
