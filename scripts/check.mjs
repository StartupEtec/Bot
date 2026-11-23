import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOTS = ['src', 'tests', 'scripts'];
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);

    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (/\.(js|mjs)$/.test(fullPath)) {
      files.push(fullPath);
    }
  }
}

for (const root of ROOTS) {
  if (existsSync(root)) walk(root);
}

let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failures += 1;
}

console.log(`${files.length} archivos JS verificados.`);
process.exit(failures ? 1 : 0);
