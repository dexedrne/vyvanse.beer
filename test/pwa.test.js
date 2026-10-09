import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('manifest installs the launcher with full-size, maskable icons and stable scope', async () => {
  const m = JSON.parse(await read('public/manifest.webmanifest'));
  assert.equal(m.name, 'vyvanse.beer');
  assert.ok(m.short_name.length <= 12);
  assert.equal(m.id, '/');
  assert.equal(m.scope, '/');
  assert.equal(new URL(m.start_url, 'https://vyvanse.beer').pathname, '/');
  assert.equal(m.display, 'fullscreen');
  assert.deepEqual(m.display_override, ['fullscreen', 'standalone']);
  assert.equal(m.orientation, 'any');
  assert.equal(m.theme_color, '#120c20');
  assert.equal(m.background_color, '#120c20');
  for (const size of [192, 512]) for (const purpose of ['any', 'maskable']) {
    const icon = m.icons.find(i => i.sizes === `${size}x${size}` && i.purpose === purpose);
    assert.equal(icon?.type, 'image/png');
    const png = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('build selects only launcher files, excluding API and game builds', async () => {
  const { shellFile } = await import('../src/pwa/build.js');
  for (const file of ['index.html', 'offline.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'favicon.svg',
    'vyvanse-pad.js', 'assets/index-abc.js', 'assets/stage-abc.js', 'assets/index-abc.css', 'assets/font-abc.woff2',
    'img/art/radtap.webp', 'models/radbro4764-hero.glb', 'audio/vyvanse-bg.m4a', 'draco/draco_decoder.wasm', 'pwa/icon-192.png'])
    assert.equal(shellFile(file), true, file);
  for (const file of ['sw.js', 'games/index.js', 'game/assets/index-abc.js', 'api/prices.json', 'img/art/radtap.prev.webp',
    'assets/game.wasm', 'anything.js', 'og4.jpg', 'models/game.glb', 'audio/game.mp3'])
    assert.equal(shellFile(file), false, file);
});

async function workerHarness() {
  const handlers = new Map();
  const responses = new Map([['/', new Response('cached launcher')], ['/offline.html', new Response("you're offline")],
    ['/assets/shell-abc.js', new Response('shell script')]]);
  const cached = [];
  const deleted = [];
  let claimed = false;
  let skipped = false;
  let online = true;
  let networkBody = 'fresh launcher';
  const cache = { match: async (req, options) => {
    const response = responses.get(typeof req === 'string' ? req : new URL(req.url).pathname);
    // Precache requests have no Origin header; module requests may carry one.
    if (!options?.ignoreVary && response?.headers.get('Vary') === 'Origin' && req.headers?.get('Origin')) return;
    return response?.clone();
  },
    addAll: async urls => { cached.push(...urls); } };
  const source = (await read('src/pwa/sw.js')).replace('__SHELL_FILES__', JSON.stringify([...responses.keys()]))
    .replace('__SHELL_VERSION__', JSON.stringify('test-version'));
  const scope = { location: { origin: 'https://vyvanse.beer' }, clients: { claim: async () => { claimed = true; } },
    skipWaiting: async () => { skipped = true; }, addEventListener: (n, f) => handlers.set(n, f) };
  vm.runInNewContext(source, { self: scope, URL, Response, Request, Headers, AbortController, setTimeout, clearTimeout,
    caches: { open: async () => cache, keys: async () => ['vyvanse-shell-old', 'vyvanse-shell-test-version', 'other-app'],
      delete: async k => deleted.push(k) },
    fetch: async () => { if (!online) throw Error('offline'); return new Response(networkBody); } });
  async function event(name, props = {}) {
    let result;
    handlers.get(name)({ ...props, waitUntil: p => { result = p; }, respondWith: p => { result = p; } });
    return result === undefined ? undefined : await result;
  }
  const request = (url, mode = 'cors', method = 'GET') => ({ url, mode, method, destination: mode === 'navigate' ? 'document' : 'script' });
  return { event, request, cached, deleted, responses, network: body => { networkBody = body; }, offline: () => { online = false; }, get claimed() { return claimed; }, get skipped() { return skipped; } };
}

test('worker caches the shell, never games or API requests, and starts offline', async () => {
  const h = await workerHarness();
  await h.event('install');
  assert.deepEqual(h.cached, ['/', '/offline.html', '/assets/shell-abc.js']);
  for (const [url, mode, method] of [
    ['https://game.example/assets/index.js', 'cors', 'GET'], ['https://vyvanse.beer/api/prices', 'cors', 'GET'],
    ['https://vyvanse.beer/games/build.js', 'cors', 'GET'], ['https://vyvanse.beer/game/', 'navigate', 'GET'],
    ['https://vyvanse.beer/assets/shell-abc.js?api=1', 'cors', 'GET'], ['https://vyvanse.beer/', 'cors', 'POST'],
  ]) assert.equal(await h.event('fetch', { request: h.request(url, mode, method) }), undefined, url);
  const online = await h.event('fetch', { request: h.request('https://vyvanse.beer/?source=pwa', 'navigate') });
  assert.equal(await online.text(), 'cached launcher', 'a changed deployment must wait for its complete shell');
  h.offline();
  const offline = await h.event('fetch', { request: h.request('https://vyvanse.beer/', 'navigate') });
  assert.equal(await offline.text(), 'cached launcher');
  h.responses.delete('/');
  const fallback = await h.event('fetch', { request: h.request('https://vyvanse.beer/', 'navigate') });
  assert.equal(await fallback.text(), "you're offline");
});

test('waiting deployment cannot mix new HTML with old unversioned art', async () => {
  const h = await workerHarness();
  h.network('<script src="/assets/new.js"></script>');
  const response = await h.event('fetch', { request: h.request('https://vyvanse.beer/', 'navigate') });
  assert.equal(await response.text(), 'cached launcher');
  h.network('cached launcher');
  const sameDeployment = await h.event('fetch', { request: h.request('https://vyvanse.beer/', 'navigate') });
  assert.equal(await sameDeployment.text(), 'cached launcher');
});

test('offline shell modules survive a server Vary: Origin header', async () => {
  const h = await workerHarness();
  h.responses.set('/assets/shell-abc.js', new Response('cached module', { headers: { Vary: 'Origin' } }));
  const request = h.request('https://vyvanse.beer/assets/shell-abc.js');
  request.headers = new Headers({ Origin: 'https://vyvanse.beer' });
  h.offline();
  const response = await h.event('fetch', { request });
  assert.equal(await response.text(), 'cached module');
});

test('new deployment clears old shell caches, and waits for an explicit update', async () => {
  const h = await workerHarness();
  await h.event('install');
  assert.equal(h.skipped, false);
  await h.event('message', { data: { type: 'vyvanse:update' } });
  assert.equal(h.skipped, true);
  await h.event('activate');
  assert.deepEqual(h.deleted, ['vyvanse-shell-old']);
  assert.equal(h.claimed, true);
});

test('cached music supports Safari byte ranges without caching a partial response', async () => {
  const h = await workerHarness();
  h.responses.set('/assets/shell-abc.js', new Response(new Uint8Array([10, 20, 30, 40]), { headers: { 'Content-Type': 'audio/mp4' } }));
  const request = h.request('https://vyvanse.beer/assets/shell-abc.js');
  request.headers = new Headers({ Range: 'bytes=1-2' });
  h.offline();
  const partial = await h.event('fetch', { request });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('Content-Range'), 'bytes 1-2/4');
  assert.deepEqual([...new Uint8Array(await partial.arrayBuffer())], [20, 30]);
});
