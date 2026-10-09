// Build first. --live records one bounded server call; subsequent browser requests replay it.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createAskHandler, makePayload, routeAnswer } from '../server/ask.js';
import { ACTIONS, LINES, BY_ID } from '../src/ask/actions.js';
import { startRedis } from '../test/support/redis.js';
import { replayAnswer } from '../test/support/recording.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = process.env.TMPDIR;
assert.ok(tmp?.endsWith('/.cache/r3g-smoke/tmp'), 'Use the owner smoke TMPDIR');
const output = process.env.ASK_SMOKE_OUTPUT || resolve(root, 'output/playwright');
mkdirSync(output, { recursive: true });
const work = mkdtempSync(resolve(tmp, 'vyvask-browser-'));
const port = Number(process.env.ASK_SMOKE_PORT || 5996);
assert.ok(port >= 5996 && port <= 5998);
const base = `http://127.0.0.1:${port}`, previewBase = `http://127.0.0.1:${port + 1}`;
const live = process.argv.includes('--live');
const fixture = resolve(root, 'test/fixtures/ask-recorded.json');
let recorded = live ? null : JSON.parse(readFileSync(fixture));
const evidence = { base, runs: [], processes: [], cleanup: [], liveCalls: 0, apiRequests: 0 };
let preview, gateway, redis;
const browsers = [];
const shots = [];
const contexts = [];
const held = [];
let mode = 'recorded';

async function waitForHeld() {
  for (let i = 0; i < 100 && !held.length; i++) await delay(10);
  assert.ok(held.length, 'A delayed request reached the HTTP handler');
}
function releaseHeld() { for (const resume of held.splice(0)) resume(); }

function localKey() {
  const text = readFileSync(resolve(homedir(), '.config/typesafe.env'), 'utf8');
  const value = text.match(/^(?:export\s+)?TYPESAFE_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim();
  assert.ok(value, 'Local TYPESAFE_API_KEY is required');
  return value.replace(/^(['"])(.*)\1$/, '$2');
}
const env = { TYPESAFE_API_KEY: live ? localKey() : 'recorded-only',
  UPSTASH_REDIS_REST_URL: 'https://local-counter.invalid', UPSTASH_REDIS_REST_TOKEN: 'local-only' };

function uncertain() {
  return { answers: { action: { type: 'choice', choice: 'play:radzombies', confidence: 0.4,
    probabilities: Object.fromEntries(ACTIONS.map(a => [a.id, { 'play:radzombies': 0.45, 'play:zombietardio': 0.35, 'play:shitbox': 0.2 }[a.id] || 0])) } } };
}
async function providerFetch(url, options) {
  if (url === env.UPSTASH_REDIS_REST_URL) return Response.json({ result: await redis.command(JSON.parse(options.body)) });
  if (mode === 'unavailable') return new Response('', { status: 503 });
  if (mode === 'uncertain') return Response.json(uncertain());
  if (mode === 'tab') return Response.json({ answers: { action: { type: 'choice', choice: 'play:solscape', confidence: 1,
    probabilities: Object.fromEntries(ACTIONS.map(a => [a.id, a.id === 'play:solscape' ? 1 : 0])) } } });
  if (live && evidence.liveCalls === 0) {
    assert.equal(JSON.parse(options.body).state.text, 'zombies as 85');
    const ids = ['play:radzombies:85', 'play:zombietardio:85', 'none'];
    const probe = { model: 'jev-1.13.0', state: { text: 'zombies as 85' }, questions: { action: { type: 'choice',
      instructions: 'Select the requested game edition. RadZombies is the base zombies game; ZombieTardio is its Retardios edition for #85 and #555. Prefer that edition when a Retardio is named unless RadZombies is explicitly named.',
      criteria: Object.fromEntries(ids.map(id => [id, BY_ID.get(id).criterion])) } } };
    const encoded = JSON.stringify(probe);
    assert.ok(Buffer.byteLength(encoded) + 1024 + 512 < 20_000, 'Bounded live probe input cap');
    evidence.liveCalls++;
    const response = await fetch(url, { ...options, body: encoded });
    evidence.providerStatus = response.status;
    assert.equal(response.status, 200, 'Live provider status');
    const raw = await response.json();
    const tokens = raw.usage?.input_tokens + raw.usage?.output_tokens;
    evidence.providerUsage = raw.usage;
    const a = raw.answers.action;
    recorded = { text: 'zombies as 85', scope: 'bounded zombie edition probe', request: probe,
      response: { model: raw.model, answers: { action: {
      type: a.type, choice: a.choice, confidence: a.confidence, probabilities: a.probabilities } }, usage: raw.usage } };
    assert.ok(Number.isSafeInteger(tokens) && tokens < 20_000, 'Live probe token cap');
    mkdirSync(dirname(fixture), { recursive: true });
    writeFileSync(fixture, JSON.stringify(recorded, null, 2) + '\n');
    const route = routeAnswer(replayAnswer(recorded));
    assert.equal(route?.action, 'play:zombietardio:85', 'Live probe selects ZombieTardio #85');
    evidence.live = { model: raw.model, usage: raw.usage, totalTokens: tokens, action: route.action,
      confidence: a.confidence, probability: a.probabilities[a.choice], requestBytes: Buffer.byteLength(encoded),
      scope: recorded.scope };
  }
  return Response.json(replayAnswer(recorded));
}

function descendants(pid) {
  try { return readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean)
    .flatMap(p => [Number(p), ...descendants(Number(p))]); } catch { return []; }
}
async function stop(child, kind) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const pids = [...descendants(child.pid).reverse(), child.pid], exited = once(child, 'exit');
  for (const pid of pids) try { process.kill(pid, 'SIGTERM'); } catch {}
  const force = setTimeout(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch {} }, 5000);
  await exited; clearTimeout(force);
  evidence.cleanup.push({ kind, pids, stoppedByPid: true });
}
async function launch(type, descriptor) {
  const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const profile = resolve(work, type); mkdirSync(profile);
  const options = { headless: true, env: { ...process.env, XDG_CACHE_HOME: profile, XDG_CONFIG_HOME: profile },
    args: type === 'chromium' ? ['--mute-audio', '--disable-dev-shm-usage', '--use-angle=gl', '--use-gl=angle'] : [] };
  if (type === 'chromium') options.executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  if (type === 'webkit' && process.env.PWA_WEBKIT_EXECUTABLE) {
    options.executablePath = process.env.PWA_WEBKIT_EXECUTABLE;
    const bundle = resolve(dirname(options.executablePath), '..');
    Object.assign(options.env, { WEBKIT_EXEC_PATH: resolve(bundle, 'bin'), WEBKIT_INJECTED_BUNDLE_PATH: resolve(bundle, 'lib'),
      WEBKIT_INSPECTOR_RESOURCES_PATH: resolve(bundle, 'share'),
      LD_LIBRARY_PATH: [resolve(bundle, 'lib'), resolve(bundle, 'sys/lib'), process.env.PWA_WEBKIT_LIBS].filter(Boolean).join(':') });
  }
  const kind = type === 'chromium' ? chromium : webkit;
  const server = await kind.launchServer(options), child = server.process();
  browsers.push({ child, kind: type });
  evidence.processes.push({ kind: type, pid: child.pid, headless: true, muted: true, profile });
  const browser = await kind.connect(server.wsEndpoint());
  return browser.newContext({ ...descriptor, reducedMotion: 'reduce', serviceWorkers: 'block' });
}

async function run(type, descriptor) {
  console.log(`${type}: native text field, terminal, controller chips and fallback`);
  const context = await launch(type, descriptor);
  contexts.push(context);
  await context.addInitScript(() => {
    window.__pads = [];
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads });
    HTMLMediaElement.prototype.play = function() { this.muted = true; return Promise.resolve(); };
    const Audio = window.AudioContext;
    if (Audio) window.AudioContext = class extends Audio { constructor(...args) { super(...args); this.suspend(); } };
  });
  if (type === 'webkit') await context.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : get.call(this, type, ...args); };
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.hostname.endsWith('.vyvanse.beer')) return route.fulfill({ contentType: 'text/html',
      body: '<!doctype html><title>Launcher game fixture</title><p>Launch URL verified; game simulation omitted.</p>' });
    return route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#menu-ask button').click();
  await page.locator('#ask-input').fill('zombies as 85');
  await page.locator('.ask-form').evaluate(form => form.requestSubmit());
  await page.locator('#player:not([hidden])').waitFor();
  assert.equal(await page.locator('#player').getAttribute('aria-label'), 'ZombieTardio');
  const url = new URL(await page.locator('.player__frame').getAttribute('src'));
  assert.equal(url.hostname, 'zombietardio.vyvanse.beer');
  assert.equal(url.searchParams.get('device'), type === 'webkit' ? 'phone' : null);
  await page.locator('.player__back').click();
  await page.locator('#player').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#games .item.on').getAttribute('data-id'), 'zombietardio');

  // Terminal exact commands stay local; free text uses the same HTTP route.
  const count = evidence.apiRequests;
  await page.keyboard.press('/');
  await page.locator('.term__input').fill('info 555');
  await page.keyboard.press('Enter');
  await page.locator('.t-bro-card').waitFor();
  assert.equal(evidence.apiRequests, count);
  await page.locator('.term__input').fill('zombies as 85');
  await page.keyboard.press('Enter');
  await page.locator('#player:not([hidden])').waitFor();
  assert.equal(evidence.apiRequests, count + 1);
  await page.locator('.player__back').click();

  // The touchpad opens chips, never a keyboard; d-pad and Cross choose locally.
  await page.evaluate(() => { window.__pads = [{ id: 'DualSense 054c', index: 0, connected: true, axes: [0, 0],
    buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: i === 17, value: i === 17 ? 1 : 0 })) }]; });
  await page.locator('.ask-dialog[open].is-pad').waitFor();
  assert.equal(await page.locator('.ask-chip').count(), 6);
  assert.equal(await page.locator('#ask-input').isVisible(), false);
  await page.evaluate(() => { window.__pads[0].buttons[17] = { pressed: false, value: 0 }; });
  await delay(80);
  const beforeChip = evidence.apiRequests;
  await page.evaluate(() => { window.__pads[0].buttons[0] = { pressed: true, value: 1 }; });
  await page.locator('#player:not([hidden])').waitFor();
  assert.equal(evidence.apiRequests, beforeChip);
  await page.evaluate(() => { window.__pads = []; });
  await page.locator('.player__back').click();

  // Command clicks cancel before the ordinary-motion typing animation begins.
  mode = 'delayed';
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('/');
  await page.evaluate(() => {
    window.__oldLaunch = false;
    const player = document.querySelector('#player');
    window.__launchObserver = new MutationObserver(() => {
      if (!player.hidden && player.getAttribute('aria-label') === 'ZombieTardio') window.__oldLaunch = true;
    });
    window.__launchObserver.observe(player, { attributes: true });
  });
  await page.locator('.term__input').fill('zombies as 85');
  await page.keyboard.press('Enter');
  await waitForHeld();
  await page.locator('.term__chips [data-cmd="open spidertag"]').click();
  releaseHeld();
  await page.waitForFunction(() => !document.querySelector('#player').hidden
    && document.querySelector('#player').getAttribute('aria-label') === 'SPIDERTAG');
  assert.equal(await page.evaluate(() => { window.__launchObserver.disconnect(); return window.__oldLaunch; }), false);
  await page.locator('.player__back').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // A cancelled terminal request cannot launch, including when the phone menu opens Ask.
  mode = 'delayed';
  await page.keyboard.press('/');
  await page.locator('.term__input').fill('zombies as 85');
  await page.keyboard.press('Enter');
  await waitForHeld();
  await page.keyboard.press('Control+c');
  releaseHeld();
  await delay(350);
  assert.equal(await page.locator('#player').isVisible(), false);
  if (type === 'webkit') {
    await page.locator('.term__input').fill('zombies as 85');
    await page.keyboard.press('Enter');
    await waitForHeld();
    await page.locator('#menu-ask button').click();
    releaseHeld();
    assert.equal(await page.locator('.os').isVisible(), false);
    await delay(350);
    assert.equal(await page.locator('#player').isVisible(), false);
    await page.locator('.ask-dialog > button').click();
  } else await page.locator('.term__close').click();

  // An ambiguous answer shows three choices and does not launch anything.
  mode = 'uncertain';
  await page.locator('#menu-ask button').click();
  await page.locator('#ask-input').fill('something with zombies');
  await page.locator('.ask-form').evaluate(form => form.requestSubmit());
  await page.waitForFunction(() => document.querySelector('#ask-status').textContent === 'which one did you mean?');
  assert.equal(await page.locator('.ask-chip').count(), 3);
  assert.equal(await page.locator('#player').isVisible(), false);

  // Closing a pending request must never allow it to launch later.
  mode = 'delayed';
  await page.locator('#ask-input').fill('zombies as 85');
  await page.locator('.ask-form').evaluate(form => form.requestSubmit());
  await waitForHeld();
  await page.locator('.ask-dialog > button').click();
  releaseHeld();
  await delay(350);
  assert.equal(await page.locator('#player').isVisible(), false);

  // An async launch of an unframed site keeps the existing blocked-tab popup readable/focused.
  mode = 'tab';
  await page.evaluate(() => { window.__open = window.open; window.open = () => null; });
  await page.locator('#menu-ask button').click();
  await page.locator('#ask-input').fill('open solscape');
  await page.locator('.ask-form').evaluate(form => form.requestSubmit());
  await page.locator('.ask:not([hidden])').waitFor();
  await delay(80);
  assert.ok((await page.locator('.ask #ask-text').textContent()).includes('can’t run inside this page'));
  assert.equal(await page.locator('.ask [data-here]').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('#ask-input').getAttribute('type'), 'text');
  await page.locator('.ask [data-cancel]').click();
  await page.evaluate(() => { window.open = window.__open; });

  mode = 'unavailable';
  await page.locator('#menu-ask button').click();
  await page.locator('#ask-input').fill('please help me find a game');
  await page.locator('.ask-form').evaluate(form => form.requestSubmit());
  await page.waitForFunction(line => document.querySelector('#ask-status').textContent === line, LINES.unavailable);
  assert.equal(await page.locator('.ask-chip').count(), 3);
  await page.locator('.ask-dialog > button').click();
  await context.setOffline(true);
  await page.locator('#menu-ask button').click();
  assert.equal(await page.locator('#ask-status').textContent(), LINES.offline);
  const beforeOffline = evidence.apiRequests;
  await page.locator('.ask-chip[data-action="crew:555"]').click();
  assert.equal(evidence.apiRequests, beforeOffline);
  assert.equal(await page.locator('#crew .item.on').getAttribute('data-id'), '555');
  await context.setOffline(false);
  await page.locator('#menu-ask button').click();
  await page.locator('#ask-input').fill('zombies as 85');
  const box = await page.locator('.ask-dialog').boundingBox();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= descriptor.viewport.width + 1
    && box.y + box.height <= descriptor.viewport.height + 1, 'Ask fits the viewport');
  assert.equal(await page.locator('#ask-input').getAttribute('type'), 'text');
  assert.equal(await page.locator('#ask-input').getAttribute('maxlength'), '200');
  shots.push({ page, path: resolve(output, `${type}.png`) });
  assert.deepEqual(errors, []);
  evidence.runs.push({ browser: type, descriptor: type === 'webkit' ? 'iPhone 16 Pro' : 'Desktop', viewport: descriptor.viewport,
    launch: url.href, exactCommandsLocal: true, terminalAsk: true, padChipsLocal: true, topThree: true,
    offlineCrew: true, lateActionCancelled: true, ctrlC: true, commandClickCancelled: true,
    blockedTabFocus: true, nativeTextField: true, pageErrors: errors });
  mode = 'recorded';
}

try {
  redis = await startRedis(); evidence.processes.push({ kind: 'redis', pid: redis.pid });
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port + 1), '--strictPort'],
    { cwd: root, env: process.env, stdio: ['ignore', openSync(resolve(output, 'preview.log'), 'w'), openSync(resolve(output, 'preview-errors.log'), 'w')] });
  evidence.processes.push({ kind: 'preview', pid: preview.pid });
  const handler = createAskHandler({ env, fetch: providerFetch });
  gateway = createServer(async (req, res) => {
    if (req.url === '/api/ask') {
      evidence.apiRequests++;
      req.headers['x-vercel-forwarded-for'] = '192.0.2.' + evidence.apiRequests;
      let body = ''; for await (const chunk of req) body += chunk;
      req.body = body;
      res.status = code => { res.statusCode = code; return res; };
      res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
      if (mode === 'delayed') await new Promise(resolve => held.push(resolve));
      return handler(req, res);
    }
    try {
      const upstream = await fetch(previewBase + req.url);
      const headers = Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key)));
      res.writeHead(upstream.status, headers);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.writeHead(503); res.end(); }
  });
  await new Promise(resolve => gateway.listen(port, '127.0.0.1', resolve));
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await delay(100);
  }
  if (live) {
    const response = await fetch(base + '/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'zombies as 85' }) });
    assert.equal((await response.json()).action, 'play:zombietardio:85');
    assert.ok(evidence.live, 'The live probe must be recorded before browser replay');
    console.log(`Live probe: ${evidence.live.totalTokens} tokens.`);
  }
  const { devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  await run('chromium', { viewport: { width: 1440, height: 900 } });
  await run('webkit', devices['iPhone 16 Pro']);
  assert.equal(evidence.liveCalls, live ? 1 : 0);
  for (const shot of shots) await shot.page.screenshot({ path: shot.path });
  evidence.passed = true;
} finally {
  releaseHeld();
  for (const context of contexts) await context.close().catch(() => {});
  for (const { child, kind } of browsers.reverse()) await stop(child, kind);
  if (gateway) await new Promise(resolve => { gateway.closeAllConnections(); gateway.close(resolve); });
  await stop(preview, 'preview');
  if (redis) { const pid = redis.pid; await redis.stop(); evidence.cleanup.push({ kind: 'redis', pids: [pid], stoppedByPid: true }); }
  rmSync(work, { recursive: true, force: true });
  writeFileSync(resolve(output, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
}
console.log('Desktop Chromium and iPhone WebKit passed; child processes stopped by PID.');
