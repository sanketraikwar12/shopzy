#!/usr/bin/env node
/**
 * Dependency audit gate.
 *
 * `npm audit` has no native way to accept a specific advisory, and its only
 * escape hatches are blunt: raise --audit-level (hides real issues) or run
 * `--force` (which here would *downgrade* into a worse, reachable flaw).
 *
 * This script fails on any advisory at or above the threshold except those
 * explicitly allowlisted below with a written justification and an expiry.
 *
 *   node scripts/audit.mjs            # fail on high/critical
 *   node scripts/audit.mjs --level=moderate
 */

import { execFileSync } from 'node:child_process';

const THRESHOLD = process.argv.find((a) => a.startsWith('--level='))?.split('=')[1] ?? 'high';

const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

/**
 * Advisories we have assessed as unreachable in this codebase.
 * Each entry must state why, and be re-checked on its review date.
 */
const ALLOWLIST = [
  {
    id: 'GHSA-qwww-vcr4-c8h2',
    package: 'react-router',
    reason:
      'CSRF bypass in React Router RSC mode. SHOPZY is a pure client-side SPA: no RSC, ' +
      'no SSR, no data router, no server actions (verified — web/src uses only BrowserRouter). ' +
      'The vulnerable code path is never loaded. Downgrading to the "fixed" 7.11.0 would ' +
      're-introduce GHSA-wrjc-x8rr-h8h6, an open redirect in <Link>/useNavigate that IS ' +
      'reachable here, so staying on 7.18.x is the lower-risk position.',
    reviewBy: '2026-11-01',
  },
];

const allowedIds = new Set(ALLOWLIST.map((a) => a.id));

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: process.platform === 'win32' });
  } catch (err) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    if (err.stdout) return err.stdout;
    throw err;
  }
}

const report = JSON.parse(runAudit());
const advisories = Object.values(report.vulnerabilities ?? {});

const blocking = [];
const accepted = [];

for (const vuln of advisories) {
  if (RANK[vuln.severity] < RANK[THRESHOLD]) continue;

  // `via` holds either advisory objects or names of upstream vulnerable packages.
  const sources = (vuln.via ?? []).filter((v) => typeof v === 'object');

  for (const source of sources) {
    const id = source.url?.split('/').pop();
    const entry = { package: vuln.name, severity: source.severity ?? vuln.severity, title: source.title, id };
    if (id && allowedIds.has(id)) accepted.push(entry);
    else blocking.push(entry);
  }
}

// --- Report ------------------------------------------------------------------

if (accepted.length) {
  console.log(`\nAccepted advisories (assessed as unreachable) — threshold: ${THRESHOLD}\n`);
  for (const a of accepted) {
    const note = ALLOWLIST.find((x) => x.id === a.id);
    console.log(`  ~ [${a.severity}] ${a.package}: ${a.title}`);
    console.log(`    ${a.id} · review by ${note.reviewBy}`);
  }
}

// Flag allowlist entries whose review date has passed, so exceptions can't rot.
const today = new Date().toISOString().slice(0, 10);
const stale = ALLOWLIST.filter((a) => a.reviewBy < today);
if (stale.length) {
  console.error(`\n✗ Allowlist entries past their review date: ${stale.map((s) => s.id).join(', ')}`);
  console.error('  Re-assess them and either fix or extend the review date.\n');
  process.exit(1);
}

if (blocking.length) {
  console.error(`\n✗ ${blocking.length} unreviewed advisory/advisories at or above "${THRESHOLD}":\n`);
  for (const b of blocking) console.error(`  ✗ [${b.severity}] ${b.package}: ${b.title}\n    ${b.id}`);
  console.error('\nFix them, or add an assessed exception to scripts/audit.mjs.\n');
  process.exit(1);
}

console.log(`\n✓ No unreviewed advisories at or above "${THRESHOLD}".\n`);
