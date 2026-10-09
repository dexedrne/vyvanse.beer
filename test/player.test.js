import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from '../src/projects.js';

// Only the DOM boundary is stubbed; launch URLs, device detection and player logic stay real.
class Element {
  className = '';
  children = [];
  selectors = new Map();
  style = { setProperty() {} };
  contentWindow = { postMessage() {}, focus() {} };
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
  addEventListener() {}
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
  globalThis.document = { body, activeElement: null, createElement: () => new Element(),
    createElementNS: () => new Element(), createTextNode: text => text };
  globalThis.addEventListener = () => {};
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
  return { player, locks, get unlocks() { return unlocks; }, get el() { return body.children[0]; } };
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
