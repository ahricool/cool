import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  throw new Error('npm audit did not return a valid report');
}
if (report.error) throw new Error(JSON.stringify(report.error));
// Nuxt -> listhen local HTTPS tooling; RSA signature verification is never used.
// No patched release exists. Not shipped in backend or static frontend runtime.
// Review this exception when updating Nuxt or when upstream publishes a patch.
const reviewed = new Set(['https://github.com/advisories/GHSA-86w9-cpqp-85rv']);
const findings = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {}))
  for (const via of vulnerability.via ?? [])
    if (typeof via !== 'string') findings.set(via.url, via);
const failures = [...findings.values()].filter(
  (v) => ['high', 'critical'].includes(v.severity) && !reviewed.has(v.url),
);
for (const v of findings.values())
  console.log(
    `${reviewed.has(v.url) ? 'REVIEWED (local dev TLS only)' : 'FINDING'}: ${v.title} ${v.url}`,
  );
if (failures.length) process.exitCode = 1;
else
  console.log(
    `Audit passed: ${findings.size} distinct advisories, ${failures.length} unreviewed high/critical findings.`,
  );
