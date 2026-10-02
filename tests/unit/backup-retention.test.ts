import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const marker = 'cool-backup-v1\n';
const generatedName = (index: number) =>
  `cool-20260101T000000.${String(index).padStart(9, '0')}Z-AbCdEf012345`;

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'cool-backup-retention-'));
  await mkdir(join(dir, 'scripts'));
  await mkdir(join(dir, 'bin'));
  for (const file of ['backup.sh', 'scripts/backup-retention.sh'])
    await copyFile(resolve(file), join(dir, file));
  await writeFile(
    join(dir, 'scripts/compose.sh'),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$COOL_CALLS"
if [[ -n "\${COOL_FAIL:-}" && "$*" == *"$COOL_FAIL"* ]]; then exit 1; fi
if [[ -n "\${COOL_EMPTY:-}" && "$*" == *"$COOL_EMPTY"* ]]; then exit 0; fi
case "$*" in
  *'ps --status running'*) [[ "\${COOL_RUNNING:-0}" != 1 ]] || echo backend-id ;;
  *pg_dump*) echo database-dump ;;
  *'--entrypoint tar'*) echo media-archive ;;
esac
`,
  );
  await chmod(join(dir, 'scripts/compose.sh'), 0o755);
  const callsPath = join(dir, 'calls.log');
  await writeFile(callsPath, '');
  const run = (extra: Record<string, string> = {}) =>
    spawnSync('bash', ['backup.sh'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        COOL_CALLS: callsPath,
        COOL_BACKUP_ROOT: 'backups',
        COOL_FAIL: '',
        COOL_EMPTY: '',
        COOL_RUNNING: '0',
        ...extra,
      },
    });
  const root = join(dir, 'backups');
  await mkdir(root);
  const makeComplete = async (
    index: number,
    options: { name?: string; root?: string; release?: boolean } = {},
  ) => {
    const name = options.name ?? generatedName(index);
    const path = join(options.root ?? root, name);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'database.dump'), `database-${index}`);
    await writeFile(join(path, 'media.tar.gz'), `media-${index}`);
    await writeFile(join(path, '.cool-backup-complete'), marker);
    if (options.release)
      await writeFile(join(path, 'release.yml'), 'services: {}\n');
    return { name, path };
  };
  return {
    dir,
    root,
    run,
    makeComplete,
    calls: () => readFile(callsPath, 'utf8'),
  };
}

test('successful backup retains newest 10 complete generated sets only', async () => {
  const f = await fixture();
  try {
    for (let index = 1; index <= 12; index++)
      await f.makeComplete(index, { release: index === 1 });
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    const names = (await readdir(f.root)).sort();
    assert.equal(names.length, 10);
    for (let index = 1; index <= 3; index++)
      assert(!names.includes(generatedName(index)));
    for (let index = 4; index <= 12; index++)
      assert(names.includes(generatedName(index)));
    const newest = names.at(-1)!;
    assert.match(newest, /^cool-\d{8}T\d{6}\.\d{9}Z-[A-Za-z0-9]{12}$/);
    assert.match(result.stdout, /Consistent backup saved:/);
    assert.equal(
      await readFile(join(f.root, newest, '.cool-backup-complete'), 'utf8'),
      marker,
    );
    assert.equal((await lstat(join(f.root, newest))).mode & 0o777, 0o700);
    for (const file of [
      'database.dump',
      'media.tar.gz',
      '.cool-backup-complete',
    ])
      assert.equal(
        (await lstat(join(f.root, newest, file))).mode & 0o777,
        0o600,
      );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

for (const failure of ['pg_dump', '--entrypoint tar', 'start backend']) {
  test(`failed ${failure} preserves all prior backups and incomplete staging`, async () => {
    const f = await fixture();
    try {
      for (let index = 1; index <= 11; index++) await f.makeComplete(index);
      const result = f.run({ COOL_FAIL: failure, COOL_RUNNING: '1' });
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /Consistent backup saved:/);
      const names = await readdir(f.root);
      for (let index = 1; index <= 11; index++)
        assert(names.includes(generatedName(index)));
      assert.equal(names.filter((name) => name.endsWith('.partial')).length, 1);
      assert.match(await f.calls(), /start backend/);
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  });
}

test('retention preserves partial, unmarked, unknown, nested and symlink content', async () => {
  const f = await fixture();
  try {
    const protectedNames: string[] = [];
    const partial = await f.makeComplete(1, {
      name: `${generatedName(1)}.partial`,
    });
    protectedNames.push(partial.name);
    const unmarked = await f.makeComplete(2);
    await rm(join(unmarked.path, '.cool-backup-complete'));
    protectedNames.push(unmarked.name);
    const unknown = await f.makeComplete(3);
    await writeFile(join(unknown.path, 'notes.txt'), 'user notes');
    protectedNames.push(unknown.name);
    const nested = await f.makeComplete(4);
    await mkdir(join(nested.path, 'extra'));
    await writeFile(join(nested.path, 'extra/keep.txt'), 'user data');
    protectedNames.push(nested.name);
    const legacy = await f.makeComplete(5, {
      name: 'cool-20260101T000000Z-123',
    });
    protectedNames.push(legacy.name);
    const badMarker = await f.makeComplete(6);
    await writeFile(
      join(badMarker.path, '.cool-backup-complete'),
      'not-generated',
    );
    protectedNames.push(badMarker.name);
    const emptyArchive = await f.makeComplete(23);
    await writeFile(join(emptyArchive.path, 'database.dump'), '');
    protectedNames.push(emptyArchive.name);
    const missingArchive = await f.makeComplete(24);
    await rm(join(missingArchive.path, 'media.tar.gz'));
    protectedNames.push(missingArchive.name);
    const outside = await f.makeComplete(7, { root: join(f.dir, 'outside') });
    await symlink(outside.path, join(f.root, outside.name));
    protectedNames.push(outside.name);
    for (const [index, filename] of [
      [8, 'database.dump'],
      [9, '.cool-backup-complete'],
      [10, 'release.yml'],
    ] as const) {
      const set = await f.makeComplete(index);
      await rm(join(set.path, filename), { force: true });
      await symlink(
        join(outside.path, 'database.dump'),
        join(set.path, filename),
      );
      protectedNames.push(set.name);
    }
    await writeFile(join(f.root, 'unrelated.txt'), 'keep me');
    for (let index = 11; index <= 22; index++) await f.makeComplete(index);
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    const names = await readdir(f.root);
    for (const name of protectedNames) assert(names.includes(name), name);
    assert.equal(names.length, protectedNames.length + 10 + 1);
    assert.equal(
      await readFile(join(outside.path, 'database.dump'), 'utf8'),
      'database-7',
    );
    assert.equal(
      await readFile(join(unknown.path, 'notes.txt'), 'utf8'),
      'user notes',
    );
    assert.equal(
      await readFile(join(nested.path, 'extra/keep.txt'), 'utf8'),
      'user data',
    );
    assert.equal(
      await readFile(join(f.root, 'unrelated.txt'), 'utf8'),
      'keep me',
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('configured backup root isolates retention from default backups', async () => {
  const f = await fixture();
  try {
    for (let index = 1; index <= 11; index++) await f.makeComplete(index);
    const isolatedRoot = join(f.dir, 'isolated backups');
    for (let index = 1; index <= 11; index++)
      await f.makeComplete(index, { root: isolatedRoot });
    const result = f.run({ COOL_BACKUP_ROOT: isolatedRoot });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readdir(f.root)).length, 11);
    assert.equal((await readdir(isolatedRoot)).length, 10);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

for (const kind of [
  'root-symlink',
  'ancestor-symlink',
  'parent-traversal',
] as const) {
  test(`unsafe backup root fails before any Compose operation: ${kind}`, async () => {
    const f = await fixture();
    try {
      const outside = join(f.dir, 'outside');
      await mkdir(outside);
      const alias = join(f.dir, 'alias');
      await symlink(outside, alias);
      const root =
        kind === 'root-symlink'
          ? alias
          : kind === 'ancestor-symlink'
            ? join(alias, 'backups')
            : `${f.dir}/backups/../outside`;
      const result = f.run({ COOL_BACKUP_ROOT: root });
      assert.notEqual(result.status, 0);
      assert.equal(await f.calls(), '');
      assert.deepEqual(await readdir(outside), []);
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  });
}

test('rapid backups remain unique with an identical timestamp', async () => {
  const f = await fixture();
  try {
    await writeFile(
      join(f.dir, 'bin/date'),
      '#!/usr/bin/env bash\necho 20261002T000000.000000001Z\n',
    );
    await chmod(join(f.dir, 'bin/date'), 0o755);
    const outputs = new Set<string>();
    for (let index = 0; index < 5; index++) {
      const result = f.run();
      assert.equal(result.status, 0, result.stderr);
      outputs.add(result.stdout.trim());
    }
    assert.equal(outputs.size, 5);
    assert.equal((await readdir(f.root)).length, 5);
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});

// Ensures future smoke changes cannot silently run retention against operator data.
test('Compose smoke sends backups to its disposable runtime directory', async () => {
  const smoke = await readFile(resolve('scripts/compose-smoke.sh'), 'utf8');
  assert.match(smoke, /readonly SMOKE_BACKUP_ROOT="\$RUNTIME_DIR\/backups"/);
  assert.match(smoke, /COOL_BACKUP_ROOT="\$SMOKE_BACKUP_ROOT"/);
});

for (const empty of ['pg_dump', '--entrypoint tar']) {
  test(`empty ${empty} output fails before pruning and resumes the backend`, async () => {
    const f = await fixture();
    try {
      for (let index = 1; index <= 11; index++) await f.makeComplete(index);
      const result = f.run({ COOL_EMPTY: empty, COOL_RUNNING: '1' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /empty archive/);
      const names = await readdir(f.root);
      assert.equal(names.length, 12);
      for (let index = 1; index <= 11; index++)
        assert(names.includes(generatedName(index)));
      assert.match(await f.calls(), /start backend/);
    } finally {
      await rm(f.dir, { recursive: true, force: true });
    }
  });
}

test('a reserved partial matching an existing completed name is retried without overwriting it', async () => {
  const f = await fixture();
  try {
    const existing = await f.makeComplete(1);
    await writeFile(
      join(f.dir, 'bin/mktemp'),
      `#!/usr/bin/env bash
set -euo pipefail
if [[ ! -f "$COOL_COLLISION_MARKER" ]]; then
  touch "$COOL_COLLISION_MARKER"
  mkdir -- "$COOL_COLLIDING_PARTIAL"
  printf '%s\\n' "$COOL_COLLIDING_PARTIAL"
else
  exec /usr/bin/mktemp "$@"
fi
`,
    );
    await chmod(join(f.dir, 'bin/mktemp'), 0o755);
    const result = f.run({
      COOL_COLLISION_MARKER: join(f.dir, 'collision-retried'),
      COOL_COLLIDING_PARTIAL: `${existing.path}.partial`,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readdir(f.root)).length, 2);
    assert.equal(
      await readFile(join(existing.path, 'database.dump'), 'utf8'),
      'database-1',
    );
    assert.equal(
      await readFile(join(existing.path, 'media.tar.gz'), 'utf8'),
      'media-1',
    );
  } finally {
    await rm(f.dir, { recursive: true, force: true });
  }
});
