// Build with the local server credential present, then grep without printing its value.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const tmp = process.env.TMPDIR;
assert.ok(tmp?.endsWith('/.cache/r3g-smoke/tmp'), 'Use the owner smoke TMPDIR');
const file = readFileSync(resolve(homedir(), '.config/typesafe.env'), 'utf8');
const raw = file.match(/^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim();
assert.ok(raw, 'Local server credential is required for this check');
const key = raw.replace(/^(['"])(.*)\1$/, '$2');
const build = spawnSync('npm', ['run', 'build'], { env: { ...process.env, TYPESAFE_API_KEY: key }, stdio: 'inherit' });
assert.equal(build.status, 0, 'Build passes with the server-only environment variable');
const dir = mkdtempSync(resolve(tmp, 'vyvask-bundle-'));
try {
  const pattern = resolve(dir, 'private-patterns');
  writeFileSync(pattern, [key, 'TYPESAFE_API_KEY', 'UPSTASH_REDIS_REST', 'https://api.typesafe.ai', 'vyv:{ask}:'].join('\n'), { mode: 0o600 });
  const result = spawnSync('rg', ['--hidden', '--text', '--files-with-matches', '--fixed-strings', '--file', pattern, 'dist'], { stdio: 'pipe' });
  assert.equal(result.status, 1, 'Built output has no credential or server-only provider/limiter code');
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('Built output grep passed: server credential and provider/limiter code stay out of the client.');
