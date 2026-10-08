import type {
  FullConfig,
  Reporter,
  Suite,
  TestResult,
} from '@playwright/test/reporter';
import { env } from 'node:process';

/** A successful command or baseline authoring run is not visual acceptance. */
export function summarizeVisualChecks(
  results: (TestResult['status'] | undefined)[],
  capturingBaseline = false,
) {
  const counts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    unexecuted: 0,
    captured: 0,
  };
  for (const status of results) {
    if (status === 'passed') {
      if (capturingBaseline) counts.captured++;
      else counts.passed++;
    } else if (status === 'skipped') counts.skipped++;
    else if (status === undefined || status === 'interrupted')
      counts.unexecuted++;
    else counts.failed++;
  }
  const accepted = results.length > 0 && counts.passed === results.length;
  return { ...counts, accepted };
}

export default class VisualStatusReporter implements Reporter {
  private suite?: Suite;
  private capturingBaseline = false;
  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    this.capturingBaseline =
      env.THEME_CAPTURE_BASELINE === '1' ||
      config.updateSnapshots === 'all' ||
      config.updateSnapshots === 'changed';
  }
  onEnd() {
    const tests =
      this.suite
        ?.allTests()
        .filter((test) =>
          /[/\\]visual-compat\.spec\.ts$/.test(test.location.file),
        ) ?? [];
    const status = summarizeVisualChecks(
      tests.map((test) => test.results.at(-1)?.status),
      this.capturingBaseline,
    );
    console.log(
      `\nVisual comparisons: ${status.passed} passed; ${status.failed} failed/blocked; ${status.skipped} skipped; ${status.unexecuted} unexecuted; ${status.captured} baseline captures.`,
    );
    if (tests.length === 0)
      console.log(
        'Visual acceptance NOT RUN: no snapshot comparison tests were selected.',
      );
    else if (!status.accepted)
      console.log(
        'Visual acceptance INCOMPLETE: skipped, unexecuted and baseline-capture cases never count as passed comparisons. A zero command exit code does not change this status.',
      );
    else
      console.log(
        'Selected visual comparisons passed. Functional-suite results must be checked separately.',
      );
  }
}
