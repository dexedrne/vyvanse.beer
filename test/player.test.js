import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from '../src/projects.js';

// Only the DOM boundary is stubbed; launch URLs, device detection and player logic stay real.
class Element {
  className = '';
  children = [];
  selectors = new Map();
  events = new Map();
  style = { setProperty() {} };
  messages = [];
  contentWindow = { postMessage: (data, origin) => this.messages.push({ data, origin }), focus() {} };
  classList = {
    contains: name => this.className.split(' ').includes(name),
    toggle: (name, on) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name); else classes.delete(name);
      this.className = [...classes].join(' ');
    },
    add: name => this.classList.toggle(name, true),
    remove: name => this.classList.toggle(name, false),
  };
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, fn) { this.events.set(name, fn); }
  append(...kids) {
    this.children.push(...kids);
    for (const kid of kids) if (kid instanceof Element) kid.parent = this;
  }
  prepend(kid) { kid.parent = this; this.children.unshift(kid); }
  remove() { this.parent.children = this.parent.children.filter(kid => kid !== this); }
  querySelector(selector) {
    if (!this.selectors.has(selector)) this.selectors.set(selector, new Element());
    return this.selectors.get(selector);
  }
  focus() {}
}
globalThis.Node = Element;
globalThis.matchMedia = () => ({ matches: false });
const { createPlayer } = await import('../src/player.js');

function harness(t, userAgent = 'iPhone') {
  const locks = [];
  let unlocks = 0;
  const body = new Element();
  const root = { dataset: { input: 'touch' } };
  globalThis.document = { body, documentElement: root, activeElement: null, createElement: () => new Element(),
    createElementNS: () => new Element(), createTextNode: text => text };
  const events = new Map();
  globalThis.addEventListener = (name, fn) => events.set(name, fn);
  globalThis.innerWidth = 402;
  globalThis.innerHeight = 874;
  const safe = { top: 62, right: 0, bottom: 34, left: 0 };
  globalThis.getComputedStyle = () => ({ getPropertyValue: name => `${safe[name.replace('--safe-', '')] || 0}px` });
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const timeouts = [];
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { const entry = { fn, ms, cleared: false }; timeouts.push(entry); return entry; });
  t.mock.method(globalThis, 'clearTimeout', entry => { if (entry) entry.cleared = true; });
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.history = { state: null, pushState(state) { this.state = state; },
    replaceState(state) { this.state = state; }, back() { this.state = null; } };
  globalThis.screen = { orientation: {
    lock: async value => { locks.push(value); }, unlock: () => { unlocks++; },
  } };
  t.mock.getter(globalThis.navigator, 'userAgent', () => userAgent);
  t.mock.method(globalThis, 'setInterval', () => 1);
  t.mock.method(globalThis, 'clearInterval', () => {});
  const player = createPlayer({ glyph: () => 'Esc', pads: () => [] });
  t.after(() => player.close({ popped: true }));
  return { player, locks, safe, root, events, timeouts, get unlocks() { return unlocks; }, get el() { return body.children[0]; } };
}
const poker = projects.find(p => p.cmd === 'pokerbros');
const landscapeGames = projects.filter(p => p.group === 'games' && p.frame && p.cmd !== 'pokerbros');

test('PokerBros opens on a phone without a landscape lock or rotate-hint class', t => {
  const h = harness(t);
  h.player.open(poker);
  assert.equal(h.player.current, poker);
  assert.equal(h.el.hidden, false);
  assert.equal(h.el.classList.contains('player--phone'), true);
  assert.equal(h.el.classList.contains('player--landscape'), false);
  assert.deepEqual(h.locks, []);
  assert.equal(new URL(h.el.children[0].src).searchParams.get('device'), 'phone');
  h.player.close();
  assert.equal(h.player.current, null);
  assert.equal(h.el.hidden, true);
  assert.equal(h.el.children.length, 0, 'leaving unloads the iframe');
});

test('every other framed game keeps landscape locking and the phone rotate-hint class', t => {
  const h = harness(t, 'Android Mobile');
  assert.ok(landscapeGames.length > 0);
  for (const p of landscapeGames) {
    const count = h.locks.length;
    h.player.open(p);
    assert.equal(h.el.classList.contains('player--phone'), true, p.cmd);
    assert.equal(h.el.classList.contains('player--landscape'), true, p.cmd);
    assert.equal(h.locks.length, count + 1, p.cmd);
    assert.equal(h.locks.at(-1), 'landscape', p.cmd);
  }
});

test('switching through PokerBros clears and restores landscape behavior', t => {
  const h = harness(t);
  h.player.open(landscapeGames[0]);
  assert.deepEqual(h.locks, ['landscape']);
  h.player.open(poker);
  assert.equal(h.el.classList.contains('player--landscape'), false);
  assert.deepEqual(h.locks, ['landscape']);
  assert.equal(h.unlocks, 1, 'release the previous game lock');
  h.player.open(landscapeGames[0]);
  assert.equal(h.el.classList.contains('player--landscape'), true);
  assert.deepEqual(h.locks, ['landscape', 'landscape']);
  h.player.close();
  assert.equal(h.el.hidden, true);
  assert.equal(h.unlocks, 3);
});

test('unavailable or rejected orientation locking leaves the rotate hint available', async t => {
  const h = harness(t);
  screen.orientation.lock = () => Promise.reject(new Error('unsupported'));
  assert.doesNotThrow(() => h.player.open(landscapeGames[0]));
  await Promise.resolve();
  assert.equal(h.el.classList.contains('player--landscape'), true);
  h.player.close();
  screen.orientation = undefined;
  assert.doesNotThrow(() => h.player.open(landscapeGames[0]));
  assert.equal(h.el.classList.contains('player--landscape'), true);
});

test('desktop and tablet games never request phone orientation locks', t => {
  const h = harness(t);
  for (const userAgent of ['Desktop', 'iPad', 'Android Tablet']) {
    t.mock.getter(globalThis.navigator, 'userAgent', () => userAgent);
    for (const p of [poker, landscapeGames[0]]) {
      h.player.open(p);
      assert.equal(h.el.classList.contains('player--phone'), false, userAgent);
      assert.equal(new URL(h.el.children[0].src).searchParams.has('device'), false, userAgent);
      h.player.close();
    }
  }
  assert.deepEqual(h.locks, []);
  assert.equal(h.unlocks, 0);
});

test('phone iframe keeps the launch URL and receives geometry excluding already-inset hardware', t => {
  const h = harness(t);
  navigator.standalone = true;
  h.player.open({ ...poker, url: `${poker.url}/?existing=1#table` });
  const frame = h.el.children[0];
  const url = new URL(frame.src);
  assert.equal(url.searchParams.get('existing'), '1');
  assert.equal(url.hash, '#table');
  assert.equal(url.searchParams.get('device'), 'phone');
  assert.equal(url.searchParams.get('vb'), '1');
  assert.equal(url.searchParams.get('safe'), '0,0,0,0');
  assert.equal(url.searchParams.get('menu'), '8,8,32,32');
  assert.equal(url.searchParams.get('standalone'), '1');
  frame.events.get('load')();
  assert.deepEqual(frame.messages.find(m => m.data.type === 'vyvanse:viewport')?.data, {
    type: 'vyvanse:viewport', safe: { top: 0, right: 0, bottom: 0, left: 0 },
    menu: { x: 8, y: 8, w: 32, h: 32 }, standalone: true, orientation: 'portrait', input: 'touch',
  });
  innerWidth = 874; innerHeight = 402;
  Object.assign(h.safe, { top: 0, right: 62, bottom: 21, left: 62 });
  h.root.dataset.input = 'ps';
  h.events.get('resize')();
  const last = frame.messages.filter(m => m.data.type === 'vyvanse:viewport').at(-1).data;
  assert.deepEqual(last.safe, { top: 0, right: 0, bottom: 21, left: 0 });
  assert.equal(last.orientation, 'landscape');
  assert.equal(last.input, 'ps');
  delete navigator.standalone;
});

test('ready is accepted only from this game; a legacy load still hides the card after 2.5 seconds', t => {
  const h = harness(t);
  h.player.open(poker);
  const frame = h.el.children[0];
  h.player.message({ source: {}, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  assert.equal(h.el.classList.contains('is-ready'), false);
  frame.events.get('load')();
  const fallback = h.timeouts.find(entry => entry.ms === 2500);
  assert.ok(fallback, 'legacy game needs a readiness fallback after load');
  h.player.message({ source: frame.contentWindow, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  assert.equal(h.el.classList.contains('is-ready'), true);
  assert.equal(fallback.cleared, true);
  h.player.close({ popped: true });
  h.player.open(poker);
  h.el.children[0].events.get('load')();
  h.timeouts.findLast(entry => entry.ms === 2500).fn();
  assert.equal(h.el.classList.contains('is-ready'), true, 'game that ignores the new contract works');
});

test('nub reveals controls for three seconds and timers cannot affect a later game', t => {
  const h = harness(t);
  h.player.open(poker);
  const frame = h.el.children[0];
  frame.events.get('load')();
  h.player.message({ source: frame.contentWindow, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  h.el.querySelector('.player__nub').events.get('click')();
  assert.equal(h.el.classList.contains('is-controls'), true);
  const collapse = h.timeouts.findLast(entry => entry.ms === 3000);
  assert.ok(collapse);
  collapse.fn();
  assert.equal(h.el.classList.contains('is-controls'), false);
  h.el.querySelector('.player__nub').events.get('click')();
  const pending = h.timeouts.at(-1);
  h.player.close({ popped: true });
  assert.equal(pending.cleared, true);
});

test('readiness retries belong to their iframe and only one remains pending', t => {
  const h = harness(t);
  h.player.open(poker);
  const first = h.el.children[0];
  first.events.get('load')();
  h.events.get('keydown')({ key: 'Escape', repeat: false, preventDefault() {} });
  h.player.message({ source: first.contentWindow, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  const retry = h.timeouts.findLast(entry => entry.ms === 200);
  first.events.get('load')();
  h.player.message({ source: first.contentWindow, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  assert.equal(retry.cleared, true, 'later readiness replaces the earlier retry');
  h.player.open(landscapeGames[0]);
  retry.fn();
  assert.equal(h.el.classList.contains('is-ready'), false, 'old iframe cannot mark a replacement ready');
});

test('legacy pad acknowledgement before load does not bypass the phone loading card', t => {
  const h = harness(t);
  h.player.open(poker);
  const frame = h.el.children[0];
  h.player.message({ source: frame.contentWindow, origin: new URL(poker.url).origin, data: { type: 'vyvanse:ready' } });
  assert.equal(h.el.classList.contains('is-ready'), false);
  frame.events.get('load')();
  assert.equal(h.el.classList.contains('is-ready'), false);
  h.timeouts.findLast(entry => entry.ms === 2500).fn();
  assert.equal(h.el.classList.contains('is-ready'), true);
});
