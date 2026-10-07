import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = globSync(['src/**/*.js', 'scripts/*.mjs', 'test/*.js', 'vite.config.js']);
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
