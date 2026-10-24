// Run under the shared browser lock, against dev or the final preview.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projects, crew, site, groups, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const tmp = process.env.TMPDIR;
assert.ok(tmp?.endsWith('/.cache/r3g-smoke/tmp'));
const output = process.env.DUO_OUTPUT;
assert.ok(output, 'Set DUO_OUTPUT to the review directory');
const phase = process.env.DUO_PHASE || 'after';
const base = process.env.DUO_URL || 'http://127.0.0.1:6365';
const profile = mkdtempSync(`${tmp}/duovy-browser-`);
mkdirSync(resolve(output, phase), { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  executablePath: '/usr/bin/chromium', headless: true,
  args: ['--mute-audio', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  viewport: { width: 626, height: 890 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
  serviceWorkers: 'allow',
});
async function cleanup() {
  await context.close().catch(() => {});
  rmSync(profile, {recursive:true,force:true});
}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await cleanup(); process.exit(143); });
const evidence = { engine: 'Chromium with iPhone UA and touch; WebKit runtime unavailable', phase, captures: [], checks: [], geometry: [], errors: [] };
evidence.rendering = process.env.DUO_LIVE === '1' ? 'live WebGL' : 'supported poster fallback';
if (phase !== 'before') evidence.build = readFileSync('dist/sw.js','utf8').match(/const VERSION = "([a-f0-9]+)"/)?.[1];
const shim = readFileSync('public/vyvanse-pad.js', 'utf8');
await context.addInitScript(live => {
  // Software GL is covered separately; broad UI captures use the supported poster fallback.
  if (!live) {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) { return /^webgl/.test(type) ? null : getContext.call(this,type,...args); };
  }
  window.__pads = [];
  Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads });
  Object.defineProperty(navigator, 'standalone', { get: () => window.__standalone !== false });
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) { this.muted = true; return play.apply(this, args); };
}, process.env.DUO_LIVE === '1');
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin === base) {
    // Baselines stay tied to the starting revision while implementation continues.
    if (phase === 'before' && /^\/src\/.*\.(css|js)$/.test(url.pathname)) {
      const body = execFileSync('git', ['show', `0eb9aee:${url.pathname.slice(1)}`], { encoding:'utf8' }).replaceAll('import.meta.env.PROD', 'false');
      return route.fulfill({ contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript', body });
    }
    if (phase === 'before' && url.pathname === '/') {
      const body = readFileSync('index.html','utf8').replace('<!-- shell -->', renderShell({site,groups,projects,crew,contact,duo}))
        .replace(/<li class="js-only"><button class="mi"[^>]*data-settings[\s\S]*?<\/li>/g,'');
      return route.fulfill({contentType:'text/html',body});
    }
    return route.continue();
  }
  if (url.pathname === '/vyvanse-pad.js') return route.fulfill({ contentType: 'text/javascript', body: shim });
  if (route.request().resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{margin:0;height:100%;background:#101a2d;color:#fff2d4;font:18px system-ui}body{display:grid;place-items:center;text-align:center;touch-action:none;user-select:none}button{min-width:120px;min-height:48px;background:#ffb12a;color:#101a2d;border:0;font:inherit}small{display:block;margin:20px}</style><body><main><h1>Player integration check</h1><p>state survives folding</p><button id="touch">tap · 0</button><small id="size"></small></main><script>window.messages=[];window.taps=0;window.loads=1;navigator.getGamepads=()=>[];addEventListener('message',e=>messages.push(e.data));document.querySelector('#touch').onclick=()=>{taps++;document.querySelector('#touch').textContent='tap · '+taps};function size(){document.querySelector('#size').textContent=innerWidth+' × '+innerHeight+' CSS px'}size();addEventListener('resize',size);</script><script src="/vyvanse-pad.js" data-launcher-origin="${base}"></script>` });
  return route.fulfill({ contentType: 'application/json', body: '{}' });
});
const page = context.pages()[0];
page.on('pageerror', error => evidence.errors.push(error.message));
page.setDefaultTimeout(12000);
const views = [['cover-portrait',466,678],['cover-landscape',678,466],['inner-portrait',626,890],['inner-landscape',890,626]];
let navigation = 0;
async function settle() {
  await page.waitForSelector('.panel.on .item.on', {state:'attached'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function go(hash) {
  await page.goto(`${base}/?duo-capture=${++navigation}#${hash}`);
  await page.evaluate(() => {
    const land = innerWidth > innerHeight;
    for (const [side,value] of Object.entries(land ? { top:0,right:44,bottom:21,left:44 } : { top:54,right:0,bottom:34,left:0 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
    dispatchEvent(new Event('resize'));
  });
  await settle();
}
async function shot(name) {
  await page.waitForTimeout(320);
  if (phase !== 'before') evidence.geometry.push(await page.evaluate(name => {
    const box = el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}; };
    const selectors = ['.top .sign','.top__right > :not([hidden])','.top .tab','.panel.on .item.on .act > a','.panel.on .item.on [data-more]',
      '.panel.on .item.on .ed','.panel.on .item.on .mi','dialog[open]','.player:not([hidden]) .player__nub','.player:not([hidden]) .player__bar'];
    const rects = selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility({visibilityProperty:true})).map(el => ({selector,...box(el)})));
    const terminal = document.querySelector('.os:not([hidden])');
    return {name,width:innerWidth,height:innerHeight,rects,
      terminal:terminal ? {opacity:getComputedStyle(terminal).opacity,background:getComputedStyle(terminal).backgroundColor,...box(terminal)} : null};
  }, name));
  await page.screenshot({ path: resolve(output, phase, `${name}.png`), animations:'disabled' });
  evidence.captures.push(name);
  console.log(`Captured ${phase}/${name}`);
}
async function leavePlayer() {
  if (!(await page.locator('.player__back').isVisible())) await page.tap('.player__nub');
  await page.tap('.player__back');
  await settle();
}
try {
  for (const [view,width,height] of views.filter(([view]) => !process.env.DUO_VIEW || process.env.DUO_VIEW === view)) {
    await page.setViewportSize({width,height});
    for (const tab of (process.env.DUO_SURFACES === 'live' ? ['games/shitbox','crew/3710'] : ['games/shitbox','crew/3710','sites','contact'])) {
      await go(tab);
      if (process.env.DUO_LIVE === '1') {
        await page.waitForSelector('.duo__gl');
        await page.waitForTimeout(1500);
      }
      await shot(`${view}-${tab.split('/')[0]}`);
    }
    if (phase === 'before' || process.env.DUO_SURFACES) continue;
    for (const game of projects.filter(p => p.group === 'games' && p.cmd !== 'shitbox')) {
      await go(`games/${game.cmd}`);
      await shot(`${view}-game-${game.cmd}`);
    }
    await go('games/shitbox');
    await page.tap('.panel.on .item.on [data-more]');
    await shot(`${view}-details`);
    await page.tap('.sheet__foot .ghost');
    await page.tap('#menu-ask button');
    await shot(`${view}-ask`);
    await page.locator('.ask-dialog').evaluate(el => el.close());
    await go('contact');
    await page.tap('[data-settings]');
    await shot(`${view}-settings`);
    const music = await page.getAttribute('#music','aria-pressed');
    await page.tap('.settings button:first-of-type');
    assert.notEqual(await page.getAttribute('#music','aria-pressed'), music);
    await page.selectOption('#quality','battery');
    assert.equal(await page.evaluate(() => localStorage.getItem('vyv-quality')), 'battery');
    await page.selectOption('#quality','auto');
    await page.locator('.settings').evaluate(el => el.close());
    await page.waitForSelector('.toast:not([hidden])', {state:'hidden'});
    await page.tap('[data-os]');
    await page.waitForSelector('.os:not([hidden])');
    await shot(`${view}-terminal`);
    await page.tap('.term__close');
    await page.tap('.tip-pill');
    await page.waitForSelector('.tip[open]');
    await shot(`${view}-tip`);
    await page.tap('.tip__close');
    await go('crew/radbro-sticker-pack');
    await shot(`${view}-pack`);
    await page.tap('.panel.on .item.on [data-more]');
    await page.tap('.sheet [data-gallery]');
    await page.waitForSelector('.pack-gallery[open]');
    await shot(`${view}-gallery`);
    await page.tap('.pack-gallery[open] [data-gallery-image]:first-of-type');
    await shot(`${view}-lightbox`);
    await page.tap('.pack-gallery[open] [data-lightbox-close]');
    await page.tap('.pack-gallery[open] [data-gallery-close]');
    await go('sites');
    await page.evaluate(() => {
      window.open = () => null;
      window.__pads = [{id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0],buttons:Array.from({length:18},(_,i)=>({pressed:i===0,touched:i===0,value:i===0?1:0}))}];
    });
    await page.waitForSelector('.ask:not([hidden])');
    await shot(`${view}-new-tab`);
    await page.evaluate(() => { window.__pads = []; });
    await page.tap('[data-cancel]');
    await page.goto(`${base}/offline.html`);
    await shot(`${view}-offline-fallback`);
    await go('games/shitbox');
    await page.evaluate(() => dispatchEvent(new Event('offline')));
    await shot(`${view}-offline`);
    await page.tap('[data-browse]');
    await page.tap('.panel.on .item.on [data-act="play"]');
    await shot(`${view}-loading`);
    await page.waitForSelector('.player.is-ready');
    await shot(`${view}-player`);
    await page.tap('.player__nub');
    await shot(`${view}-player-menu`);
    await leavePlayer();
    await page.evaluate(() => { window.__standalone = false; });
    await page.tap('.panel.on .item.on [data-act="play"]');
    await shot(`${view}-install`);
    await leavePlayer();
    evidence.checks.push(`${view}: sound, Auto/Battery preference, touch menu and player return`);
  }
  if (phase !== 'before' && process.env.DUO_FOLD !== 'skip') {
    await page.setViewportSize({width:626,height:890});
    await go('games/shitbox');
    await page.tap('.panel.on .item.on [data-act="play"]');
    await page.waitForSelector('.player.is-ready');
    const game = page.frames().find(f => f !== page.mainFrame());
    const iframe = await page.locator('iframe').elementHandle();
    await game.locator('#touch').tap();
    let expectedTaps = 1;
    for (const [view,width,height] of views) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => {
        const land = innerWidth > innerHeight;
        for (const [side,value] of Object.entries(land ? {top:0,right:44,bottom:21,left:44} : {top:54,right:0,bottom:34,left:0}))
          document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
        dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(200);
      assert.equal(await iframe.evaluate(el => el === document.querySelector('iframe')),true);
      assert.equal(await game.evaluate(() => taps),expectedTaps);
      await game.locator('#touch').tap();
      expectedTaps++;
      assert.equal(await game.evaluate(() => taps),expectedTaps);
      const packet = await game.evaluate(() => messages.filter(m => m.type === 'vyvanse:viewport').at(-1));
      assert.equal(packet.menu.w,44);
      assert.equal(packet.width,await game.evaluate(() => innerWidth));
      assert.equal(packet.height,await game.evaluate(() => innerHeight));
      await shot(`fold-${view}`);
      evidence.checks.push(`${view}: same iframe, preserved state, fresh touch and viewport geometry`);
    }
    await page.evaluate(() => {
      window.__pads = [{id:'DualSense Wireless Controller', index:0, connected:true, mapping:'standard', timestamp:performance.now(), axes:[0,0], buttons:Array.from({length:18},(_,i)=>({pressed:i===2,touched:i===2,value:i===2?1:0}))}];
    });
    await page.waitForTimeout(100);
    assert.equal(await page.getAttribute('html','data-input'),'ps');
    assert.equal(await game.evaluate(() => VyvansePad.getGamepads()[0].buttons[2].pressed),true);
    await page.evaluate(() => { window.__pads = []; });
    await page.waitForTimeout(100);
    assert.equal(await page.getAttribute('html','data-input'),'touch');
    assert.equal(await game.evaluate(() => VyvansePad.getGamepads().filter(Boolean).length),0);
    await page.evaluate(() => {
      window.__pads = [{id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[0,0],buttons:Array.from({length:18},(_,i)=>({pressed:i===8||i===9,touched:i===8||i===9,value:i===8||i===9?1:0}))}];
    });
    await page.waitForSelector('.player__hold:not([hidden])');
    await shot('fold-controller-hold');
    await page.waitForSelector('.player', {state:'hidden'});
    await page.evaluate(() => { window.__pads = []; });
    evidence.checks.push('controller connect/relay/disconnect restores touch; screenshots use a cross-origin stateful fixture, not hosted game internals');
  }
} finally {
  await cleanup();
  writeFileSync(resolve(output, `${phase}${process.env.DUO_VIEW ? '-'+process.env.DUO_VIEW : ''}-evidence.json`), JSON.stringify(evidence,null,2));
}
assert.deepEqual(evidence.errors, []);
