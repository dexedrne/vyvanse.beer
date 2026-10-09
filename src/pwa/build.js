import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Exact build-time allowlist: no runtime URL heuristics can accidentally admit a game or API.
export function shellFile(file) {
  if (file.includes('.prev.')) return false;
  return ['index.html', 'offline.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'favicon.svg', 'vyvanse-pad.js'].includes(file) ||
    /^assets\/[^/]+\.(js|css|woff2)$/.test(file) || /^img\/.*\.(webp|jpg|png)$/.test(file) || /^pwa\/[^/]+\.png$/.test(file) ||
    /^models\/(radbro(?:2564|3704|3710|4764|652|723)|retardio(?:555|85))-hero\.glb$/.test(file) ||
    /^audio\/vyvanse-bg\.(m4a|webm)$/.test(file) || /^draco\/draco_(decoder\.wasm|wasm_wrapper\.js)$/.test(file);
}

export function writeWorker(dir) {
  const files = globSync('**/*', { cwd: dir, nodir: true }).filter(shellFile).sort();
  const hash = createHash('sha256');
  const template = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  hash.update(template);
  for (const file of files) hash.update(file).update(readFileSync(resolve(dir, file)));
  const version = hash.digest('hex').slice(0, 16);
  const paths = files.map(file => file === 'index.html' ? '/' : `/${file}`);
  writeFileSync(resolve(dir, 'sw.js'), template.replace('__SHELL_FILES__', JSON.stringify(paths)).replace('__SHELL_VERSION__', JSON.stringify(version)));
}
