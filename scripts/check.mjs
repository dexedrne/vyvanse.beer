import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = globSync(['src/**/*.js', 'api/*.js', 'server/*.js', 'public/vyvanse-pad.js', 'scripts/*.mjs', 'test/**/*.js', 'vite.config.js']);
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);

const { projects, sections } = await import('../src/projects.js');
for (const cmd of ['radquest', 'radcraft', 'brogate']) {
  if (!projects.some(p => p.cmd === cmd)) throw new Error(`Missing game: ${cmd}`);
}
for (const p of projects.filter(p => p.group === 'games')) {
  if (!sections.some(s => s.id === p.section)) throw new Error(`Missing game section: ${p.cmd}`);
}
