import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const MIN_LINES = Number(process.env.COVERAGE_MIN_LINES ?? 60);
const reportPath = resolve('coverage/lcov.info');
const summaryPath = resolve('coverage/coverage-summary.json');

mkdirSync(dirname(reportPath), { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--experimental-test-coverage',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=lcov',
    `--test-reporter-destination=${reportPath}`,
  ],
  { stdio: 'inherit' },
);

if (result.status !== 0) process.exit(result.status ?? 1);

const lcov = readFileSync(reportPath, 'utf8');

function totalFor(field) {
  const matches = lcov.match(new RegExp(`^${field}:(\\d+)$`, 'gm')) ?? [];
  return matches.reduce((total, line) => total + Number(line.split(':')[1]), 0);
}

function metric(coveredField, totalField) {
  const covered = totalFor(coveredField);
  const total = totalFor(totalField);
  return { total, covered, pct: total ? Number(((covered / total) * 100).toFixed(2)) : 100 };
}

const total = {
  lines: metric('LH', 'LF'),
  functions: metric('FNH', 'FNF'),
  branches: metric('BRH', 'BRF'),
};

writeFileSync(summaryPath, `${JSON.stringify({ total }, null, 2)}\n`);

console.log('\nCobertura mínima exigida: lineas >= ' + MIN_LINES + '%');
console.log('| Métrica | Cobertura |');
console.log('|---|---:|');
for (const [name, value] of Object.entries(total)) {
  console.log(`| ${name} | ${value.pct}% (${value.covered}/${value.total}) |`);
}

if (total.lines.pct < MIN_LINES) {
  console.error(`Cobertura de líneas ${total.lines.pct}% < ${MIN_LINES}%`);
  process.exitCode = 1;
}
