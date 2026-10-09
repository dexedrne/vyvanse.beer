// Run after npm run build. Install Playwright separately or set PLAYWRIGHT_MODULE to its module.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, openSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const { chromium, webkit, devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = process.env.TMPDIR;
assert.ok(tmp?.endsWith('/.cache/r3g-smoke/tmp'), 'Use the owner smoke TMPDIR');
const output = process.env.PWA_SMOKE_OUTPUT || resolve(root, 'output/playwright');
mkdirSync(output, { recursive: true });
const port = Number(process.env.PWA_SMOKE_PORT || 5960);
assert.ok(port >= 5960 && port <= 5964);
const base = `http://127.0.0.1:${port}`;
const work = mkdtempSync(`${tmp}/vyvpwa-smoke-`);
const evidence = { base, profileRoot: work, runs: [], processes: [], cleanup: [] };
const version = JSON.parse(readFileSync(resolve(root, 'dist/sw.js'), 'utf8').match(/const VERSION = ("[a-f0-9]+")/)[1]);
const shotVersion = resolve(output, 'screenshots-version.txt');
if (!existsSync(shotVersion) || readFileSync(shotVersion, 'utf8').trim() !== version) {
  for (const name of ['iphone-portrait', 'iphone-landscape', 'desktop']) rmSync(resolve(output, `${name}.png`), { force: true });
  writeFileSync(shotVersion, version + '\n');
}
evidence.shellVersion = version;
const shim = readFileSync(resolve(root, 'public/vyvanse-pad.js'), 'utf8');
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: root, env: process.env, stdio: ['ignore', openSync(resolve(output, 'preview.log'), 'w'), openSync(resolve(output, 'preview-errors.log'), 'w')] });
evidence.processes.push({ kind: 'preview', pid: preview.pid });
const browsers = [];
const shots = [];
async function until(probe, label, ms = 30000) {
  const end = Date.now() + ms;
  let lastError;
  while (Date.now() < end) { try { if (await probe()) return; } catch (error) { lastError = error; } await delay(100); }
  throw Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}
function descendants(pid) {
  try { return readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).flatMap(p => [Number(p), ...descendants(Number(p))]); }
  catch { return []; }
}
async function stop(child, kind) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const pids = [...descendants(child.pid).reverse(), child.pid];
  const exited = once(child, 'exit');
  for (const pid of pids) try { process.kill(pid, 'SIGTERM'); } catch {}
  const timeout = setTimeout(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch {} }, 5000);
  await exited;
  clearTimeout(timeout);
  evidence.cleanup.push({ kind, pids, stoppedByPid: true });
}
async function launch(type) {
  const profile = resolve(work, `${type}-${browsers.length}`);
  mkdirSync(profile);
  const options = { headless: true, env: { ...process.env, XDG_CACHE_HOME: profile, XDG_CONFIG_HOME: profile },
    args: type === 'chromium' ? ['--mute-audio', '--disable-dev-shm-usage', '--use-angle=gl', '--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] : [] };
  if (type === 'chromium') options.executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  if (type === 'webkit' && process.env.PWA_WEBKIT_EXECUTABLE) {
    options.executablePath = process.env.PWA_WEBKIT_EXECUTABLE;
    const bundle = resolve(dirname(options.executablePath), '..');
    Object.assign(options.env, { WEBKIT_EXEC_PATH: resolve(bundle, 'bin'), WEBKIT_INJECTED_BUNDLE_PATH: resolve(bundle, 'lib'),
      WEBKIT_INSPECTOR_RESOURCES_PATH: resolve(bundle, 'share'),
      LD_LIBRARY_PATH: [resolve(bundle, 'lib'), resolve(bundle, 'sys/lib'), process.env.PWA_WEBKIT_LIBS].filter(Boolean).join(':') });
  }
  const kind = type === 'webkit' ? webkit : chromium;
  const server = await kind.launchServer(options);
  const child = server.process();
  browsers.push({ child, kind: type });
  evidence.processes.push({ kind: type, pid: child.pid, headless: true, muted: true, profile });
  return kind.connect(server.wsEndpoint());
}
async function setup(context, softwareFallback) {
  await context.addInitScript(() => {
    window.__pads = [];
    window.__plays = 0;
    window.__frames = 0;
    const requestFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => requestFrame.call(window, time => { window.__frames++; callback(time); });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) { this.muted = true; window.__plays++; return play.apply(this, args); };
  });
  if (softwareFallback) await context.addInitScript(() => {
    // Desktop WPE software GL can stall on the existing water shader. Exercise its supported
    // poster fallback here; Chromium still renders the live puddle/duo in the desktop run.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /^webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.hostname.endsWith('.vyvanse.beer')) {
      if (url.pathname.endsWith('/vyvanse-pad.js')) return route.fulfill({ contentType: 'text/javascript', body: shim });
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#120c20;color:#c6b3f7;font:24px system-ui;padding:60px}</style><h1>iframe game fixture</h1><p>pad relay + phone contract</p><script>window.messages=[];navigator.getGamepads=()=>[];addEventListener('message',e=>messages.push({data:e.data,origin:e.origin,fromParent:e.source===parent}));</script><script src="/vyvanse-pad.js" data-launcher-origin="${base}"></script>` });
    }
    return route.fulfill({ contentType: 'application/json', body: '{}' });
  });
}
async function rects(page, safe) {
  const result = await page.evaluate(() => {
    const box = sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    const rootStyle = getComputedStyle(document.documentElement);
    return { w: innerWidth, h: innerHeight, safe: ['top', 'left', 'right', 'bottom'].map(s => rootStyle.getPropertyValue(`--safe-${s}`)), topPadding: getComputedStyle(document.querySelector('.top')).padding,
      topSafe: getComputedStyle(document.querySelector('.top')).getPropertyValue('--safe-top'),
      tip: box('.tip-pill'), music: box('#music'), update: document.querySelector('.pwa-update')?.hidden === false ? box('.pwa-update') : null,
      cart: box('#games .slot.sel .cart'), play: box('#games .item.on [data-act="play"]'),
      panels: box('.panels'), gamePanel: box('#games'), fonts: document.fonts.status,
      duo: { ...box('.duo'), visible: getComputedStyle(document.querySelector('.duo')).visibility,
        poster: [...document.querySelectorAll('.duo__poster img')].map(img => ({ width: img.naturalWidth, height: img.naturalHeight })) },
      tabs: [...document.querySelectorAll('.tab')].map(t => {
      const r = t.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    }), strip: box('.strip'), selection: getComputedStyle(document.querySelector('#screen')).userSelect,
    touch: getComputedStyle(document.querySelector('#screen')).touchAction, overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
    reducedIterations: getComputedStyle(document.querySelector('.ticker')).animationIterationCount };
  });
  for (const b of [result.tip, result.music, result.update, ...result.tabs].filter(Boolean)) {
    assert.ok(b.x >= safe.l && b.right <= result.w - safe.r + 1, `safe horizontal bounds: ${JSON.stringify({ b, result })}`);
    assert.ok(b.y >= safe.t && b.bottom <= result.h - safe.b + 1, `safe vertical bounds: ${JSON.stringify({ b, result, safe })}`);
    assert.ok(b.h >= (safe.t || safe.l || safe.b ? 44 : 24));
  }
  assert.equal(result.selection, 'none');
  assert.ok(!result.touch.includes('pinch-zoom'));
  assert.equal(result.overscroll, 'none');
  assert.equal(result.reducedIterations, '1', 'reduced motion stops infinite menu animations');
  if (result.w <= 960 && (safe.t || safe.l || safe.b)) {
    assert.ok(result.cart.y >= safe.t && result.cart.bottom <= result.strip.y + 1,
      `selected cartridge stays above the hints: ${JSON.stringify({ cart: result.cart, strip: result.strip, panels: result.panels, gamePanel: result.gamePanel, fonts: result.fonts, w: result.w, h: result.h })}`);
    assert.ok(result.cart.w >= 44 && result.cart.h >= 44, 'cartridges are large touch targets');
    assert.ok(result.play.y >= safe.t && result.play.bottom <= result.strip.y + 1,
      `Play stays above the hints: ${JSON.stringify({ play: result.play, strip: result.strip })}`);
  }
  assert.equal(result.duo.visible, 'visible');
  assert.ok(result.duo.poster.every(img => img.width > 0 && img.height > 0), 'existing duo art loads');
  return result;
}
async function run(browser, name, descriptor, safe, phone) {
  console.log(`${name}: menu, iframe and offline checks`);
  const context = await browser.newContext({ ...descriptor, reducedMotion: 'reduce' });
  await setup(context, phone);
  // Set simulated compositor insets before the first stylesheet/layout, also after reload.
  await context.addInitScript(safe => {
    const apply = () => {
      if (!document.documentElement) return false;
      for (const [side, value] of Object.entries({ top: safe.t, left: safe.l, right: safe.r, bottom: safe.b }))
        document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
      return true;
    };
    if (!apply()) {
      const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
      observer.observe(document, { childList: true });
    }
  }, safe);
  const page = await context.newPage();
  await page.bringToFront();
  page.setDefaultTimeout(30000);
  const errors = [];
  const failedRequests = [];
  evidence.currentRun = { name, pageErrors: errors, failedRequests };
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  await page.goto(`${base}/#games/spidertag`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#screen:not(.boot)');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => window.__plays), 0, 'audio waits for first gesture');
  const layout = await rects(page, safe);
  await page.evaluate(() => { document.querySelector('.pwa-update').hidden = false; });
  await rects(page, safe);
  await page.evaluate(() => { document.querySelector('.pwa-update').hidden = true; });
  console.log(`${name}: safe areas checked`);
  assert.equal(await page.getAttribute('html', 'data-phone'), String(phone));
  const press = async selector => {
    const target = page.locator(selector);
    await target.waitFor({ state: 'visible' });
    await target.evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }));
    let hit;
    // WebKit must finish repainting a formerly content-hidden menu after the iframe closes.
    await until(async () => {
      hit = await target.evaluate((el, selector) => {
        const r = el.getBoundingClientRect();
        const point = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        const reached = document.elementFromPoint(point.x, point.y);
        return { reaches: r.width > 0 && r.height > 0 && !!reached?.closest(selector), point,
          box: { x: r.x, y: r.y, width: r.width, height: r.height }, element: reached?.outerHTML.slice(0, 300) };
      }, selector);
      return hit.reaches;
    }, `reachable target ${selector}`, 30000);
    const { point } = hit;
    if (phone) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  };
  await press('.tab[data-tab="crew"]');
  await page.waitForSelector('#crew.on');
  assert.ok(await page.evaluate(() => window.__plays > 0), 'first gesture starts audio');
  await press('#menu-back');
  await page.waitForSelector('#games.on');
  // Both the tabs and bare artwork support swipes without replacing the cartridge layout.
  const beforeSwipe = await page.evaluate(() => location.hash);
  await page.evaluate(() => {
    const target = document.querySelector('#screen');
    for (const [type, x] of [['touchstart', 230], ['touchend', 90]]) {
      const event = new Event(type, { bubbles: true });
      const point = { clientX: x, clientY: 200 };
      Object.defineProperty(event, 'touches', { value: [point] });
      Object.defineProperty(event, 'changedTouches', { value: [point] });
      target.dispatchEvent(event);
    }
  });
  assert.notEqual(await page.evaluate(() => location.hash), beforeSwipe);
  await page.keyboard.press('ArrowLeft');
  await press('.tab[data-tab="contact"]');
  await press('[data-tip].tip-pill');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await press('#menu-back');
  await press('#music');
  assert.equal(await page.getAttribute('#music', 'aria-pressed'), 'false');
  await press('#music');
  assert.equal(await page.getAttribute('#music', 'aria-pressed'), 'true');
  console.log(`${name}: touch tabs, back, tip and music checked`);
  await page.evaluate(() => {
    const target = document.querySelector('.tabs');
    for (const [type, x] of [['touchstart', 230], ['touchend', 90]]) {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: 10 }] });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientX: x, clientY: 10 }] });
      target.dispatchEvent(event);
    }
  });
  await page.waitForSelector('#crew.on');
  await press('#menu-back');
  // A unit-controlled pad snapshot proves the integration; this does not emulate Bluetooth.
  await page.evaluate(() => { window.__pads = [{ index: 0, id: 'DualSense Wireless Controller', mapping: 'standard', connected: true, timestamp: 123,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, (_, i) => ({ value: i === 2 ? 1 : 0, pressed: i === 2, touched: i === 2 })) }]; });
  await until(() => page.getAttribute('html', 'data-input').then(s => s === 'ps'), 'PS input scheme');
  assert.equal(await page.locator('#games .item.on [data-g="a"]').textContent(), '✕');
  assert.equal(await page.locator('#games .item.on [data-g="y"]').textContent(), '△');
  await page.evaluate(() => window.__pads[0].buttons.forEach(b => { b.value = 0; b.pressed = b.touched = false; }));
  if (phone) {
    await press('#music');
    await until(() => page.getAttribute('html', 'data-input').then(s => s === 'touch'), 'tap takes hints from idle pad');
    await press('#music');
  }
  await page.evaluate(() => Object.assign(window.__pads[0].buttons[0], { value: 1, pressed: true, touched: true }));
  await page.waitForSelector('.player.is-ready');
  await page.evaluate(() => Object.assign(window.__pads[0].buttons[0], { value: 0, pressed: false, touched: false }));
  const frame = await page.locator('.player__frame').elementHandle();
  const game = await frame.contentFrame();
  try {
    await until(() => game.evaluate(phone => !!window.VyvansePad?.device.phone === phone && window.messages?.some(m => m.data.type === 'vyvanse:device'), phone), 'device message');
  } catch (error) {
    evidence.iframeFailure = await game.evaluate(() => ({ href: location.href, device: window.VyvansePad?.device,
      messages: window.messages, scripts: [...document.scripts].map(s => ({ src: s.src, launcher: s.dataset.launcherOrigin })),
      body: document.body?.textContent.slice(0, 2000) }));
    evidence.pageErrors = errors;
    throw error;
  }
  const src = await page.getAttribute('.player__frame', 'src');
  if (phone) assert.equal(await page.getAttribute('html', 'data-input'), 'ps', 'controller stays primary while launching');
  assert.equal(new URL(src).searchParams.get('device'), phone ? 'phone' : null);
  const allow = await page.getAttribute('.player__frame', 'allow');
  for (const feature of ['gamepad', 'fullscreen', 'autoplay', 'accelerometer']) assert.ok(allow.split(';').map(s => s.trim()).includes(feature));
  const back = await page.locator('.player__back').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  assert.ok(back.x >= safe.l + 8 && back.y >= safe.t + 8 && back.height >= 44);
  try {
    await until(() => game.evaluate(() => !!navigator.getGamepads()[0]?.connected), 'relayed pad in iframe');
  } catch (error) {
    evidence.padFailure = {
      parent: await page.evaluate(() => ({ hidden: document.hidden, frames: window.__frames, pads: window.__pads })),
      game: await game.evaluate(() => ({ hidden: document.hidden, frames: window.__frames,
        device: window.VyvansePad?.device, received: window.messages?.length,
        pads: navigator.getGamepads(), recent: window.messages?.slice(-2) })),
    };
    throw error;
  }
  console.log(`${name}: origin-restricted relay checked`);
  const messages = await game.evaluate(() => window.messages.filter(m => m.data.type.startsWith('vyvanse:')).slice(-4));
  assert.ok(messages.every(m => m.origin === base && m.fromParent));
  // Same-origin sibling windows and forged origins cannot ask the player to close.
  await page.evaluate(() => dispatchEvent(new MessageEvent('message', { data: { type: 'vyvanse:menu' }, origin: 'https://spidertag.vyvanse.beer', source: window })));
  assert.equal(await page.locator('.player__frame').count(), 1);
  await game.evaluate(origin => parent.postMessage({ type: 'vyvanse:menu' }, origin), base);
  await until(() => page.locator('.player__frame').count().then(n => n === 0), 'authenticated iframe menu');
  await press('#games .item.on [data-act="play"]');
  await page.waitForSelector('.player.is-ready');
  await press('.player__back');
  await until(() => page.locator('.player__frame').count().then(n => n === 0), 'touch back unloads frame');
  await press('#games .item.on [data-act="play"]');
  await page.waitForSelector('.player.is-ready');
  await page.evaluate(() => { for (const i of [8, 9]) Object.assign(window.__pads[0].buttons[i], { value: 1, pressed: true, touched: true }); });
  await until(() => page.locator('.player__frame').count().then(n => n === 0), 'hold Create + Options returns');
  await page.evaluate(() => window.__pads = []);
  await until(() => page.getAttribute('html', 'data-input').then(s => s === (phone ? 'touch' : 'kb')), 'disconnect clears scheme');
  await until(() => page.evaluate(async () => !!navigator.serviceWorker.controller), 'installed shell worker', 45000);
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r => r.url)))).flat());
  assert.ok(cached.length > 20);
  assert.ok(cached.every(u => new URL(u).origin === locationOrigin(base) && !new URL(u).pathname.startsWith('/api/')));
  // Simulate another window replacing our worker while a game is open. The actual reload
  // must wait for Back and restore the menu URL before the next document starts.
  await press('#games .item.on [data-act="play"]');
  await page.waitForSelector('.player.is-ready');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  assert.equal(await page.locator('.player__frame').count(), 1, 'update preserves active play');
  const reloaded = page.waitForEvent('domcontentloaded');
  await press('.player__back');
  await reloaded;
  await page.waitForSelector('#screen:not(.boot)');
  await page.evaluate(() => document.fonts.ready);
  assert.ok(new URL(page.url()).hash.startsWith('#games/'), 'deferred update reloads the selected menu URL');
  assert.equal(await page.locator('.player__frame').count(), 0, 'update does not reopen the game');
  await context.setOffline(true);
  await page.reload();
  try { await page.waitForSelector('#offline-card:not([hidden])'); }
  catch (error) {
    evidence.offlineFailure = await page.evaluate(async () => ({ online: navigator.onLine,
      screen: document.querySelector('#screen')?.className, card: document.querySelector('#offline-card')?.outerHTML,
      controller: navigator.serviceWorker.controller?.scriptURL,
      cache: await Promise.all((await caches.keys()).map(async k => ({ name: k, entries: await Promise.all((await (await caches.open(k)).keys())
        .filter(r => r.url.includes('/assets/') && r.url.endsWith('.js')).map(async r => ({ url: r.url, origin: r.headers.get('Origin'), vary: (await (await caches.open(k)).match(r)).headers.get('Vary') }))) }))) }));
    throw error;
  }
  await press('[data-browse]');
  await press('#games .item.on [data-act="play"]');
  await page.waitForSelector('#offline-card:not([hidden])');
  assert.equal(await page.locator('.player__frame').count(), 0);
  await context.setOffline(false);
  await page.waitForSelector('#offline-card[hidden]', { state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.deepEqual(errors, []);
  await rects(page, safe);
  let installedLayout;
  if (name === 'iphone-landscape') {
    await page.setViewportSize({ width: 874, height: 402 });
    installedLayout = await rects(page, safe);
    await press('.tab[data-tab="crew"]');
    await page.waitForSelector('#crew.on');
    await press('#menu-back');
    await page.setViewportSize(descriptor.viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await rects(page, safe);
  }
  await page.evaluate(() => document.querySelector('.panels').scrollTo({ top: 0, behavior: 'instant' }));
  evidence.runs.push({ name, descriptor, safeAreaTest: 'CSS insets injected; desktop WebKit does not simulate the iOS compositor', layout, src, allow, back, messages,
    installedLayout,
    cachedFiles: cached.length, offlineLaunch: true, deferredUpdate: true, originChecks: true, comboReturn: true, pageErrors: errors,
    graphics: phone ? 'existing poster fallback (desktop WPE software renderer)' : 'live water and duo', nativeHardware: 'not emulatable' });
  const path = resolve(output, `${name}.png`);
  // Keep at most three captures of a compiled shell, even if a later device case needs a retry.
  if (!existsSync(path)) await page.screenshot({ path, animations: 'disabled' });
  shots.push(path);
  return context;
}
const locationOrigin = url => new URL(url).origin;
try {
  await until(async () => (await fetch(base)).ok, 'preview ready');
  // Finish and stop each headless process before the next device, including its screenshot.
  const cases = [
    ['webkit', 'iphone-landscape', devices['iPhone 16 Pro landscape'], { t: 0, l: 62, r: 62, b: 21 }, true],
    ['webkit', 'iphone-portrait', devices['iPhone 16 Pro'], { t: 62, l: 0, r: 0, b: 34 }, true],
    ['chromium', 'desktop', { viewport: { width: 1440, height: 900 }, hasTouch: false }, { t: 0, l: 0, r: 0, b: 0 }, false],
  ].filter(c => !process.env.PWA_SMOKE_CASE || c[1] === process.env.PWA_SMOKE_CASE);
  assert.ok(cases.length);
  for (const [type, name, descriptor, safe, phone] of cases) {
    const browser = await launch(type);
    await run(browser, name, descriptor, safe, phone);
    await stop(browsers.at(-1).child, type);
  }
  assert.equal(shots.length, cases.length);
  evidence.screenshots = shots;
  evidence.passed = true;
  console.log(JSON.stringify(evidence.runs.map(r => ({ name: r.name, cachedFiles: r.cachedFiles, offline: r.offlineLaunch, errors: r.pageErrors })), null, 2));
} catch (e) {
  evidence.passed = false;
  evidence.error = e.stack;
  throw e;
} finally {
  for (const b of browsers.reverse()) await stop(b.child, b.kind);
  await stop(preview, 'preview');
  rmSync(work, { recursive: true, force: true });
  evidence.profilesRemoved = true;
  writeFileSync(resolve(output, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
}
