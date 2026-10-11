// Run against dev or the single final preview build; Playwright is installed separately.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { projects } from '../src/projects.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const tmp = process.env.TMPDIR;
assert.ok(tmp?.endsWith('/.cache/r3g-smoke/tmp'), 'Use the smoke TMPDIR');
const base = process.env.IPHONE_SMOKE_URL || 'http://127.0.0.1:6365';
assert.ok(Number(new URL(base).port) >= 6365 && Number(new URL(base).port) <= 6369);
const output = resolve(process.env.IPHONE_SMOKE_OUTPUT || 'output/playwright/iphone');
mkdirSync(output, { recursive: true });
const profile = mkdtempSync(`${tmp}/vyviphone-browser-`);
const server = await chromium.launchServer({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  env: { ...process.env, XDG_CACHE_HOME: profile, XDG_CONFIG_HOME: profile },
  args: ['--mute-audio', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const child = server.process();
console.log(`Muted headless browser PID ${child.pid}; profile ${profile}`);
const browser = await chromium.connect(server.wsEndpoint());
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1';
const results = [];
const failures = [];
const states = [
  ['01-app-portrait-games-touch', 'app', 'portrait', 'games', 'spidertag', 'touch'],
  ['02-app-portrait-games-pad', 'app', 'portrait', 'games', 'spidertag', 'ps'],
  ['03-app-portrait-games-editions', 'app', 'portrait', 'games', 'retardiopayne', 'ps'],
  ['04-app-portrait-games-details', 'app', 'portrait', 'games', 'spidertag', 'ps', 'details'],
  ['05-app-portrait-crew', 'app', 'portrait', 'crew', '', 'ps'],
  ['06-app-portrait-sites', 'app', 'portrait', 'sites', '', 'touch'],
  ['07-app-portrait-contact', 'app', 'portrait', 'contact', '', 'ps'],
  ['08-app-portrait-player-loading-rotate', 'app', 'portrait', 'games', 'spidertag', 'ps', 'loading'],
  ['09-app-portrait-player-pokerbros-loading', 'app', 'portrait', 'games', 'pokerbros', 'touch', 'loading'],
  ['10-app-portrait-player-pokerbros-ready', 'app', 'portrait', 'games', 'pokerbros', 'touch', 'ready'],
  ['11-safari-portrait-games-touch', 'safari', 'portrait', 'games', 'spidertag', 'touch'],
  ['12-safari-portrait-games-shitbox-pad', 'safari', 'portrait', 'games', 'shitbox', 'ps'],
  ['13-safari-portrait-crew', 'safari', 'portrait', 'crew', '', 'touch'],
  ['14-app-landscape-games-pad', 'app', 'land', 'games', 'spidertag', 'ps'],
  ['15-app-landscape-games-touch-shitbox', 'app', 'land', 'games', 'shitbox', 'touch'],
  ['16-app-landscape-crew', 'app', 'land', 'crew', '', 'ps'],
  ['17-app-landscape-contact', 'app', 'land', 'contact', '', 'touch'],
  ['18-app-landscape-player-loading', 'app', 'land', 'games', 'spidertag', 'ps', 'loading'],
  ['19-app-landscape-player-ready', 'app', 'land', 'games', 'spidertag', 'ps', 'ready'],
  ['20-app-landscape-player-hold', 'app', 'land', 'games', 'spidertag', 'ps', 'hold'],
  ['21-safari-landscape-games', 'safari', 'land', 'games', 'spidertag', 'touch'],
  ['22-safari-landscape-details', 'safari', 'land', 'games', 'spidertag', 'ps', 'details'],
  ['23-safari-portrait-player-pokerbros-a2hs', 'safari', 'portrait', 'games', 'pokerbros', 'touch', 'loading'],
  ['24-safari-landscape-player-ready', 'safari', 'land', 'games', 'spidertag', 'touch', 'ready'],
];
const only = process.env.IPHONE_SMOKE_ONLY?.split(',');
mkdirSync(resolve(output, 'raw'), { recursive: true });
const shim = readFileSync('public/vyvanse-pad.js', 'utf8');
const fixtureFont = readFileSync('node_modules/@fontsource-variable/spline-sans/files/spline-sans-latin-wght-normal.woff2').toString('base64');
async function setup(width, height, safe, standalone, poster = true, offline = false) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: offline ? 'allow' : 'block' });
  await context.addInitScript(({ safe, standalone, poster }) => {
    window.__pads = [];
    if (poster) {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : getContext.call(this, type, ...args); };
    }
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads });
    Object.defineProperty(navigator, 'standalone', { value: standalone });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) { this.muted = true; return play.apply(this, args); };
    addEventListener('DOMContentLoaded', () => {
      if (window.top !== window) return;
      ['top', 'right', 'bottom', 'left'].forEach((s, i) => document.documentElement.style.setProperty(`--safe-${s}`, `${safe[i]}px`));
    });
  }, { safe, standalone, poster });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.pathname === '/vyvanse-pad.js') return route.fulfill({ contentType: 'text/javascript', body: shim });
    if (url.hostname === 'api.coingecko.com') return route.fulfill({ json: { bitcoin: { usd: 121400, usd_24h_change: 1.2 }, ethereum: { usd: 4218, usd_24h_change: -.4 }, solana: { usd: 231, usd_24h_change: 3.1 }, ripple: { usd: 2.5, usd_24h_change: 0 } } });
    if (route.request().resourceType() === 'document') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>@font-face{font-family:Spline;src:url("data:font/woff2;base64,${fixtureFont}")}html,body{margin:0;height:100%;background:#0b3d2e;color:#e9e4d2;font:16px/1.4 Spline,system-ui}body{display:grid;place-items:center;text-align:center}b{display:block;font-size:34px}button{position:fixed;right:10px;bottom:50px;width:80px;height:44px;opacity:0}</style><body><div><b>${url.hostname}</b>the game, in the player's iframe<br><small id="size"></small></div><button id="touch">game input</button><script>window.messages=[];window.taps=0;window.keys=0;navigator.getGamepads=()=>[];addEventListener('message',e=>messages.push(e.data));document.querySelector('#touch').onclick=()=>taps++;addEventListener('keydown',()=>keys++);function size(){document.querySelector('#size').textContent=innerWidth+' × '+innerHeight+' css px'}size();addEventListener('resize',size);new ResizeObserver(size).observe(document.documentElement);</script><script src="/vyvanse-pad.js" data-launcher-origin="${base}"></script>` });
    return route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  return { context, page };
}
async function pad(page, buttons = [], axes = [0, 0]) {
  await page.evaluate(({ buttons, axes }) => {
    window.__pads = [{ id: 'DualSense Wireless Controller', index: 0, mapping: 'standard', connected: true, timestamp: performance.now(), axes,
      buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: buttons.includes(i), touched: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) }];
  }, { buttons, axes });
  await page.waitForTimeout(65);
}
async function pressPad(page, button) { await pad(page, [button]); await pad(page); }
async function settle(page) {
  await page.waitForSelector('.panel.on .item.on');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(800);
  await page.waitForSelector('.toast:not([hidden])', { state: 'hidden' });
}
async function metrics(page) {
  return page.evaluate(() => {
    const box = sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    const root = getComputedStyle(document.documentElement);
    const screen = document.querySelector('#screen');
    const wm = document.querySelector('.panel.on .item.on .wm');
    const range = document.createRange();
    if (wm.lastChild.nodeType === Node.TEXT_NODE) range.selectNode(wm.lastChild); else range.selectNodeContents(wm);
    const r = range.getBoundingClientRect();
    const pairCanvas = box('#duo');
    const duo = document.querySelector('#duo');
    const inset = parseFloat(getComputedStyle(duo).getPropertyValue('--pair-left')) || 0;
    const pair = { ...pairCanvas, x: pairCanvas.x + inset, w: pairCanvas.w - inset, y: pairCanvas.y - pairCanvas.h * .024, bottom: pairCanvas.bottom - pairCanvas.h * .024 };
    return { width: innerWidth, height: innerHeight, viewport: [visualViewport.width, visualViewport.height],
      safe: ['top', 'right', 'bottom', 'left'].map(s => parseFloat(root.getPropertyValue(`--safe-${s}`)) || 0),
      top: box('.top'), pair, pairCanvas, pairVisible: getComputedStyle(duo).visibility !== 'hidden',
      words: box('.panel.on .item.on .words'), body: box('.panel.on .item.on .body'), act: box('.panel.on .item.on .act'), shelf: box('.panel.on .shelf'),
      bro: box('.panel.on .item.on .bro'), crew: box('.panel.on .item.on .visual--crew'),
      bodyOverflow: getComputedStyle(document.querySelector('.panel.on .item.on .body')).overflowY,
      hiddenUpdate: !document.querySelector('.pwa-update[hidden]') || getComputedStyle(document.querySelector('.pwa-update[hidden]')).display === 'none',
      tabs: box('.tabs'), strip: box('.strip'), play: box('.panel.on .item.on [data-act]'), fontSize: getComputedStyle(wm).fontSize,
      wordmark: { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width }, band: parseFloat(getComputedStyle(screen).getPropertyValue('--band')),
      sheetBody: box('.sheet:not([hidden]) .sheet__body'), sheetHead: box('.sheet:not([hidden]) .sheet__head'), sheetFoot: box('.sheet:not([hidden]) .sheet__foot'), credit: box('.sheet:not([hidden]) .credit'),
      sheet: box('.sheet:not([hidden])'), sheetAlpha: document.querySelector('.sheet:not([hidden])') && getComputedStyle(document.querySelector('.sheet')).backgroundColor,
      sheetMore: document.querySelector('.sheet')?.classList.contains('is-more'),
      sheetLinksPlain: [...document.querySelectorAll('.sheet a')].every(a => getComputedStyle(a).textDecorationLine === 'none'),
      contactOsDetail: document.querySelector('#contact [data-os] .det')?.textContent,
      frame: box('.player__frame'), nub: box('.player__nub'), rotate: document.querySelector('.player__rotate') && getComputedStyle(document.querySelector('.player__rotate')).display,
      cardArtZ: document.querySelector('.player__card') && getComputedStyle(document.querySelector('.player__card img')).zIndex,
      cardScrimZ: document.querySelector('.player__card') && getComputedStyle(document.querySelector('.player__card'), '::before').zIndex,
      input: document.documentElement.dataset.input, scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  });
}
function check(m, name, state) {
  const ensure = (truth, message) => { if (!truth) failures.push(`${name}: ${message}`); };
  const land = m.width > m.height;
  ensure(m.top.y >= m.safe[0], 'top bar clears hardware');
  ensure(m.hiddenUpdate, 'hidden update control stays hidden');
  if (name.includes('crew')) ensure(m.bodyOverflow === 'visible' || m.play.bottom <= m.body.bottom + 1, 'Crew download button is not clipped');
  ensure(m.shelf.bottom <= m.strip.y + 1, 'shelf clears the strip');
  ensure(m.strip.bottom <= m.height - m.safe[2] + 1, 'strip clears bottom inset');
  if (m.pairVisible) {
    ensure(m.pair.y >= m.top.bottom - 1, `pair top ${m.pair.y} clears top bar ${m.top.bottom}`);
    if (!land) ensure(m.wordmark.right <= m.pair.x - 12 + 1, `wordmark right ${m.wordmark.right} clears pair left ${m.pair.x}`);
  }
  if (!land) ensure(m.shelf.y <= m.body.bottom + 12, 'no flexible middle gap');
  ensure(Number.isFinite(m.band), 'measured waterline');
  if (state === 'details') {
    ensure(m.sheetAlpha === 'rgb(12, 8, 22)', 'details sheet is opaque');
    ensure(m.sheetLinksPlain, 'details links match the mockup');
  }
  if (name.includes('contact')) ensure(m.contactOsDetail === 'the terminal', 'Contact terminal detail matches the mockup');
  if (['loading', 'ready', 'hold'].includes(state)) {
    ensure(Number(m.cardScrimZ) > Number(m.cardArtZ), 'card scrim is above art');
    ensure(m.frame.w === m.width - m.safe[1] - m.safe[3], 'legacy game width');
    ensure(m.frame.h === m.height - m.safe[0] - (land ? 0 : m.safe[2]), 'legacy game height');
  }
}
try {
  for (const [name, ctx, orient, tab, game, scheme, state] of states) {
    if (only && !only.some(prefix => name.startsWith(prefix))) continue;
    const land = orient === 'land';
    const app = ctx === 'app';
    const width = land ? app ? 874 : 756 : 402;
    const height = land ? app ? 402 : 352 : app ? 874 : 681;
    const safe = app ? land ? [0, 62, 21, 62] : [62, 0, 34, 0] : land ? [0, 0, 21, 0] : [0, 0, 0, 0];
    const { context, page } = await setup(width, height, safe, app);
    await page.goto(`${base}/#${tab}${game ? '/' + game : ''}`);
    await settle(page);
    if (scheme === 'ps') { await pressPad(page, 2); await settle(page); }
    if (state === 'details') { if (scheme === 'ps') await pressPad(page, 3); else await page.tap('.panel.on .item.on [data-more]'); await page.waitForTimeout(300); }
    const before = await metrics(page);
    if (['loading', 'ready', 'hold'].includes(state)) {
      if (scheme === 'ps') await pressPad(page, 0); else await page.tap('.panel.on .item.on [data-act="play"]');
      if (state !== 'loading') await page.waitForSelector('.player.is-ready', { timeout: 10000 });
      if (state === 'hold') {
        await pad(page, [8, 9]);
        await page.waitForSelector('.player__hold:not([hidden])');
        await page.waitForTimeout(330);
      }
    }
    if (state === 'loading') assert.equal(await page.getAttribute('#player', 'class').then(c => c.includes('is-ready')), false, `${name}: loading card stays visible`);
    const m = { ...before, ...(await metrics(page)), name, context: ctx, orientation: orient, state: state || 'menu' };
    // The launcher is visibility-hidden during play; preserve its settled geometry for checks.
    for (const key of ['top', 'pair', 'pairVisible', 'words', 'body', 'act', 'shelf', 'wordmark', 'band', 'strip', 'tabs']) m[key] = before[key];
    results.push(m);
    check(m, name, state);
    await page.screenshot({ path: resolve(output, 'raw', `${name}.png`), animations: 'disabled', timeout: 90000 });
    console.log(`Captured ${name}: band ${m.band}, word ${m.fontSize}, pair ${m.pair.w}×${m.pair.h}`);
    await context.close();
  }
  if (!only || only.includes('interactions')) {
    const { context, page } = await setup(402, 874, [62, 0, 34, 0], true);
    await page.goto(`${base}/#games`); await settle(page);
    const updateHidden = await page.evaluate(() => {
      const button = Object.assign(document.createElement('button'), { className: 'tog pwa-update', hidden: true, textContent: 'update' });
      document.querySelector('.top__right').append(button);
      const hidden = getComputedStyle(button).display === 'none';
      button.remove();
      return hidden;
    });
    assert.equal(updateHidden, true, 'production hidden update must stay hidden on phones');
    // Pad zones and global edition/tab actions.
    await pressPad(page, 2);
    await pressPad(page, 12);
    assert.equal(await page.getAttribute('#screen', 'data-zone'), 'actions');
    await pressPad(page, 15); await pressPad(page, 0);
    assert.equal(await page.isVisible('.sheet'), true);
    await pressPad(page, 12);
    assert.equal(await page.evaluate(() => document.activeElement.closest('.links') !== null), true);
    await pressPad(page, 13); await pressPad(page, 15);
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim().endsWith('close')), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.querySelector('.sheet').contains(document.activeElement)), true);
    await pressPad(page, 1);
    assert.equal(await page.isVisible('.sheet'), false);
    const musicBefore = await page.getAttribute('#music', 'aria-pressed');
    await pressPad(page, 9);
    assert.notEqual(await page.getAttribute('#music', 'aria-pressed'), musicBefore);
    await pressPad(page, 17);
    assert.equal(await page.isVisible('.ask-dialog[open]'), true);
    const askMusic = await page.getAttribute('#music', 'aria-pressed');
    await pressPad(page, 9);
    assert.notEqual(await page.getAttribute('#music', 'aria-pressed'), askMusic);
    await pressPad(page, 1);
    assert.equal(await page.isVisible('.ask-dialog[open]'), false);
    await pressPad(page, 5);
    assert.equal(await page.getAttribute('#screen', 'data-tab'), 'crew');
    await pressPad(page, 15);
    assert.equal(await page.getAttribute('#crew .item.on', 'data-id'), '3704');
    await pressPad(page, 5);
    await pressPad(page, 3); await page.keyboard.press('Escape');
    assert.equal(await page.getAttribute('#screen', 'data-tab'), 'sites');
    await page.evaluate(() => { window.open = () => null; });
    await pressPad(page, 3); await pressPad(page, 0);
    assert.equal(await page.isVisible('.ask'), true, 'pad site launch retains popup fallback');
    await pressPad(page, 1); await pressPad(page, 5);
    assert.equal(await page.getAttribute('#screen', 'data-tab'), 'contact');
    await pressPad(page, 13);
    assert.equal(await page.getAttribute('#contact .mi.sel', 'data-i'), '1');
    await pressPad(page, 1);
    assert.equal(await page.getAttribute('#screen', 'data-tab'), 'contact');
    // Keyboard selection, edition switches and sheet close.
    await page.keyboard.press('e');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getAttribute('#games .item.on', 'data-id'), 'retardiopayne');
    await page.keyboard.press('i'); await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('.sheet'), false);
    // Touch shelf selection and modal outside close.
    await page.tap('.tabs [data-tab="games"]');
    await page.tap('#games .cart[data-i="0"]');
    await page.tap('.panel.on .item.on [data-more]');
    await page.tap('.dim', { position: { x: 10, y: 180 } });
    assert.equal(await page.isVisible('.sheet'), false);
    // A swipe over Sites selects a shell; its synthetic click must not open it.
    await page.tap('.tabs [data-tab="sites"]');
    const beforeSwipe = await page.getAttribute('#sites .item.on', 'data-id');
    await page.evaluate(() => {
      const target = document.querySelector('.panel.on');
      const touch = x => new Touch({ identifier: 1, target, clientX: x, clientY: 180 });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(260)] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(100)] }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 180 }));
    });
    assert.notEqual(await page.getAttribute('#sites .item.on', 'data-id'), beforeSwipe);
    assert.equal(await page.isVisible('.ask'), false);
    // Legacy game ignores viewport messages and still loads, receives touch/keys/pad, exits.
    await page.goto(`${base}/?smoke=legacy#games/pokerbros`); await settle(page);
    await page.tap('.panel.on .item.on [data-act="play"]');
    await page.waitForSelector('.player.is-ready');
    const game = page.frames().find(frame => frame.url().includes('pokerbros.vyvanse.beer'));
    assert.deepEqual(await game.evaluate(() => [innerWidth, innerHeight]), [402, 778]);
    await game.locator('#touch').tap();
    assert.equal(await game.evaluate(() => taps), 1);
    await game.locator('body').press('Enter');
    assert.equal(await game.evaluate(() => keys), 1);
    await pressPad(page, 0);
    assert.ok(await game.evaluate(() => messages.some(m => m.type === 'vyvanse:pads')));
    await page.tap('.player__nub');
    assert.equal(await page.isVisible('.player__bar'), true);
    await page.waitForTimeout(3150);
    assert.equal(await page.isVisible('.player__bar'), false);
    await pad(page, [8, 9]);
    await page.waitForSelector('.player[hidden]', { state: 'attached' });
    await pad(page);
    assert.equal(await page.getAttribute('#games .item.on', 'data-id'), 'pokerbros');
    await context.close();
    console.log('Touch, keyboard, pad zones, sheet, music, legacy iframe, nub and hold exit passed.');

    // All current framed games retain their own viewport without reading the new contract.
    for (const [width, height, safe] of [[402, 874, [62, 0, 34, 0]], [874, 402, [0, 62, 21, 62]]]) {
      const { context, page } = await setup(width, height, safe, true);
      for (const p of projects.filter(p => p.frame)) {
        console.log(`Legacy viewport ${width}×${height}: ${p.cmd}`);
        await page.goto(`${base}/?smoke=${p.cmd}#games/${p.cmd}`); await settle(page);
        await page.tap('.panel.on .item.on [data-act="play"]');
        await page.waitForSelector('.player.is-ready');
        const game = page.frames().find(f => f.parentFrame());
        assert.deepEqual(await game.evaluate(() => [innerWidth, innerHeight]), [width - safe[1] - safe[3], height - safe[0] - (width > height ? 0 : safe[2])], p.cmd);
        await game.locator('#touch').tap();
        assert.equal(await game.evaluate(() => taps), 1, `${p.cmd}: touch reaches iframe`);
      }
      await context.close();
      console.log(`Every legacy game fits and receives touch at ${width}×${height}.`);
    }

    const safari = await setup(402, 874, [0, 0, 34, 0], false);
    await safari.page.goto(`${base}/?probe#games`); await settle(safari.page);
    for (const height of [780, 681, 720]) {
      await safari.page.evaluate(height => {
        Object.defineProperty(visualViewport, 'height', { configurable: true, value: height });
        visualViewport.dispatchEvent(new Event('resize'));
      }, height);
      await safari.page.waitForFunction(height => document.querySelector('#screen').getBoundingClientRect().height === height, height);
      const m = await metrics(safari.page);
      assert.equal(await safari.page.locator('#screen').evaluate(el => el.getBoundingClientRect().height), height);
      assert.ok(m.strip.bottom <= height - 34 + 1, 'floating toolbar inset is always respected');
      assert.ok(m.pair.y >= m.top.bottom - 1, 'pair remains below the bar during toolbar resize');
      assert.ok(m.shelf.y <= m.body.bottom + 12, 'toolbar resize cannot create a middle gap');
    }
    assert.equal(await safari.page.isVisible('.viewport-probe'), true);
    await safari.page.tap('.panel.on .item.on [data-more]');
    await safari.page.locator('.sheet__body').evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
    assert.equal(await safari.page.locator('.sheet').evaluate(el => el.classList.contains('is-more')), false);
    await safari.page.evaluate(() => {
      document.querySelector('.sheet__body').scrollTop = 0;
      const target = document.querySelector('.sheet__head');
      const touch = y => new Touch({ identifier: 1, target, clientX: 200, clientY: y });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(250)] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(360)] }));
    });
    assert.equal(await safari.page.isVisible('.sheet'), false);
    await safari.page.goto(`${base}/?smoke=a2hs#games/pokerbros`); await settle(safari.page);
    await safari.page.tap('.panel.on .item.on [data-act="play"]');
    assert.equal(await safari.page.isVisible('.a2hs'), true);
    await safari.page.tap('.a2hs__x');
    assert.equal(await safari.page.isVisible('.a2hs'), false);
    assert.equal(await safari.page.evaluate(() => localStorage.getItem('a2hs')), '1');
    await safari.page.tap('.player__back');
    await safari.page.waitForSelector('.player[hidden]', { state: 'attached' });
    await safari.page.tap('.panel.on .item.on [data-act="play"]');
    assert.equal(await safari.page.isVisible('.a2hs'), false);
    await safari.context.close();
    console.log('Floating Safari viewport/insets, probe and persistent Add-to-Home-Screen dismissal passed.');

  }
  if (!only || only.includes('live') || only.includes('interactions')) {
    // Exercise the actual 3D figures and puddle separately from deterministic mockup captures.
    mkdirSync(resolve(output, 'live'), { recursive: true });
    for (const [width, height, safe, tab] of [[402, 874, [62, 0, 34, 0], 'games'], [402, 874, [62, 0, 34, 0], 'crew'], [874, 402, [0, 62, 21, 62], 'games'], [874, 402, [0, 62, 21, 62], 'crew']]) {
      const { context, page } = await setup(width, height, safe, true, false);
      await page.goto(`${base}/?smoke=live#${tab}`); await settle(page);
      await page.waitForSelector('.screen.duo-live.water-on', { timeout: 30000 });
      await pad(page);
      const painted = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
        const canvas = document.querySelector('.duo__gl');
        const gl = canvas.getContext('webgl2');
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let count = 0, top = canvas.height;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) {
          count++;
          top = Math.min(top, canvas.height - 1 - Math.floor((i / 4) / canvas.width));
        }
        resolve({ width: canvas.width, height: canvas.height, count, top });
      })));
      assert.ok(painted.count > 100, 'live cast actually paints');
      assert.ok(painted.top > 0, 'live heads are not clipped by the canvas');
      await pressPad(page, 2);
      await page.screenshot({ path: resolve(output, 'live', `${tab}-${width}x${height}.png`), timeout: 90000 });
      await context.close();
      console.log(`Live cast, wave and water ${tab} ${width}×${height}: ${painted.count} painted pixels; top margin ${painted.top}.`);
    }
  }
  if (process.env.IPHONE_SMOKE_PWA === '1') {
    for (const [width, height, safe] of [[402, 874, [62, 0, 34, 0]], [874, 402, [0, 62, 21, 62]]]) {
      const { context, page } = await setup(width, height, safe, true, true, true);
      await page.goto(`${base}/?smoke=offline#games/spidertag`); await settle(page);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 45000 });
      await page.waitForFunction(async () => (await caches.keys()).some(k => k.startsWith('vyvanse-shell-')));
      const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async k => (await (await caches.open(k)).keys()).map(r => r.url)))).flat());
      assert.ok(cached.length > 20, 'installed app caches the complete launcher');
      assert.ok(cached.every(url => new URL(url).origin === new URL(base).origin), 'games stay out of the launcher cache');
      await context.setOffline(true);
      await page.reload(); await settle(page);
      assert.equal(await page.locator('.panel.on .item.on .wm').innerText(), 'SPIDERTAG');
      assert.equal(await page.isVisible('#offline-card'), true);
      await page.tap('#offline-card [data-browse]');
      await page.tap('.tabs [data-tab="crew"]');
      assert.equal(await page.getAttribute('#screen', 'data-tab'), 'crew');
      await context.close();
      console.log(`Production installed shell starts offline at ${width}×${height}; ${cached.length} cached files.`);
    }
  }
  assert.deepEqual(failures, [], 'phone smoke failures');
} finally {
  if (results.length) writeFileSync(resolve(output, 'metrics.json'), JSON.stringify(results, null, 2));
  const descendants = pid => {
    try { return readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).flatMap(p => [Number(p), ...descendants(Number(p))]); } catch { return []; }
  };
  const pids = [...descendants(child.pid).reverse(), child.pid];
  const exited = once(child, 'exit');
  for (const pid of pids) try { process.kill(pid, 'SIGTERM'); } catch {}
  await exited;
  console.log(`Stopped browser by exact PIDs: ${pids.join(', ')}`);
}
