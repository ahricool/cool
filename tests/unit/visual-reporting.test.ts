import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeVisualChecks } from '../theme/visual-reporter';

test('missing baselines, unexecuted and interrupted checks never count as visual passes', () => {
  assert.deepEqual(
    summarizeVisualChecks(['passed', 'skipped', undefined, 'interrupted']),
    {
      passed: 1,
      failed: 0,
      skipped: 1,
      unexecuted: 2,
      captured: 0,
      accepted: false,
    },
  );
  assert.equal(
    summarizeVisualChecks(Array(32).fill('skipped')).accepted,
    false,
  );
  assert.equal(summarizeVisualChecks([]).accepted, false);
});

test('baseline capture is distinct from comparison and failures retain incomplete status', () => {
  assert.deepEqual(summarizeVisualChecks(['passed'], true), {
    passed: 0,
    failed: 0,
    skipped: 0,
    unexecuted: 0,
    captured: 1,
    accepted: false,
  });
  assert.equal(
    summarizeVisualChecks(['passed', 'failed', 'timedOut']).failed,
    2,
  );
  assert.equal(summarizeVisualChecks(['passed', 'failed']).accepted, false);
  assert.equal(summarizeVisualChecks(['passed', 'passed']).accepted, true);
});
