import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function harness() {
  const events = new Map();
  let timer;
  let pads = [];
  const root = { dataset: {} };
  const acts = [];
  const source = (await readFile(new URL('../src/input.js', import.meta.url), 'utf8')).replaceAll('export ', '');
  const context = vm.createContext({ acts, document: { documentElement: root, querySelectorAll: () => [] },
    navigator: { getGamepads: () => pads }, matchMedia: () => ({ matches: true }), performance: { now: () => 100 }, Event,
    addEventListener: (n, fn) => events.set(n, fn), dispatchEvent() {},
    setInterval: fn => { timer = fn; return 1; }, clearInterval: () => { timer = null; } });
  vm.runInContext(`${source}\nglobalThis.input = createInput({ act: n => acts.push(n), mode: () => 'menu' });`, context);
  const pad = { id: 'DualSense Wireless Controller', index: 0, connected: true, axes: [0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })) };
  return { root, acts, input: context.input, pad, setPads: p => { pads = p; }, poll: () => timer?.(), touch: () => events.get('pointerdown')({ pointerType: 'touch' }) };
}

test('discover an already-paired iOS pad without a connection event; last input wins', async () => {
  const h = await harness();
  h.poll();
  h.pad.buttons[0] = { value: 1, pressed: true, touched: true };
  h.setPads([h.pad]);
  h.poll();
  assert.deepEqual(h.acts, ['ok']);
  assert.equal(h.root.dataset.input, 'ps');
  assert.equal(h.input.glyph('a'), '✕');
  h.pad.buttons[0] = { value: 0, pressed: false, touched: false };
  h.poll();
  h.touch();
  assert.equal(h.root.dataset.input, 'touch');
  assert.equal(h.input.scheme, 'touch');
  h.poll();
  assert.equal(h.input.scheme, 'touch', 'idle connected pad must not steal touch hints');
  h.pad.buttons[3] = { value: 1, pressed: true, touched: true };
  h.poll();
  assert.equal(h.input.glyph('y'), '△');
  h.setPads([]);
  h.poll();
  assert.equal(h.input.scheme, 'touch');
});

test('Gamepad API policy errors leave the menu usable', async () => {
  const h = await harness();
  h.setPads({ [Symbol.iterator]() { throw new DOMException('Blocked', 'SecurityError'); } });
  assert.doesNotThrow(h.poll);
  assert.equal(h.input.pads().length, 0);
});
