import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const pad = { index: 2, id: 'DualSense Wireless Controller', mapping: 'standard', connected: true, timestamp: 123,
  axes: [-0.5, 0.25, 0, 1], buttons: [{ value: 1, pressed: true, touched: true }, { value: 0.25, pressed: false, touched: true }] };

test('relay sends compact pad state only to the game origin and authenticates replies', async () => {
  const { createPadRelay } = await import('../src/pad-relay.js');
  const sent = [];
  const target = { postMessage: (data, origin) => sent.push({ data, origin }) };
  let pads = [null, pad];
  const relay = createPadRelay({ target, url: 'https://game.example/play?room=1', pads: () => pads,
    device: () => ({ type: 'vyvanse:device', phone: true, touch: true, pad: pads.some(p => p?.connected) }) });
  relay.tick();
  assert.deepEqual(sent[0], { origin: 'https://game.example', data: { type: 'vyvanse:device', phone: true, touch: true, pad: true } });
  assert.deepEqual(sent[1], { origin: 'https://game.example', data: { type: 'vyvanse:pads', v: 1, pads: [
    { index: 2, id: pad.id, mapping: 'standard', connected: true, timestamp: 123, axes: [-0.5, 0.25, 0, 1], buttons: [[1, 3], [0.25, 2]] },
  ] } });
  assert.equal(relay.accepts({ origin: 'https://evil.example', source: target }), false);
  assert.equal(relay.accepts({ origin: 'https://game.example', source: {} }), false);
  assert.equal(relay.accepts({ origin: 'https://game.example', source: target }), true);
  const n = sent.length;
  relay.tick();
  assert.equal(sent.length, n + 1, 'pads refresh each frame; unchanged device does not chatter');
  pads = [];
  relay.tick();
  assert.equal(sent.at(-2).data.pad, false);
  assert.deepEqual(sent.at(-1).data.pads, []);
});

async function shimHarness(native = () => []) {
  const handlers = new Map();
  const events = [];
  const parent = { postMessage: (data, origin) => events.push({ data: structuredClone(data), origin }) };
  let now = 100;
  const window = { parent, addEventListener: (name, fn) => handlers.set(name, fn), dispatchEvent: e => { events.push(e); handlers.get(e.type)?.(e); },
    location: { search: '?device=phone' } };
  const document = { referrer: 'https://vyvanse.beer/', currentScript: { dataset: {} }, hidden: false,
    addEventListener: (name, fn) => handlers.set(name, fn) };
  const navigator = { getGamepads: native };
  vm.runInNewContext(await readFile(new URL('../public/vyvanse-pad.js', import.meta.url), 'utf8'),
    { window, document, navigator, URL, URLSearchParams, Event, CustomEvent: class extends Event { constructor(n, o) { super(n); this.detail = o?.detail; } },
      performance: { now: () => now } });
  return { window, navigator, events, parent, send: (data, origin = 'https://vyvanse.beer', source = parent) => handlers.get('message')({ data, origin, source }),
    elapse: ms => { now += ms; } };
}
const packed = { type: 'vyvanse:pads', v: 1, pads: [{ ...pad, buttons: [[1, 3], [0.25, 2]] }] };

test('game shim ignores foreign windows/origins, exposes relay and releases stale input', async () => {
  const h = await shimHarness(() => { throw new DOMException('blocked', 'SecurityError'); });
  assert.deepEqual(h.events[0], { data: { type: 'vyvanse:ready' }, origin: 'https://vyvanse.beer' });
  h.send(packed, 'https://evil.example');
  h.send(packed, 'https://vyvanse.beer', {});
  assert.equal(h.navigator.getGamepads().filter(Boolean).length, 0);
  h.send(packed);
  const p = h.navigator.getGamepads()[2];
  assert.equal(p.id, pad.id);
  assert.equal(p.buttons[0].pressed, true);
  assert.equal(p.buttons[1].touched, true);
  assert.equal(p.axes[0], -0.5);
  h.send({ type: 'vyvanse:device', phone: true, touch: true, pad: true });
  assert.equal(h.window.VyvansePad.device.phone, true);
  h.elapse(600);
  assert.equal(h.navigator.getGamepads().filter(Boolean).length, 0);
  assert.ok(h.events.some(e => e.type === 'gamepadconnected'));
  assert.ok(h.events.some(e => e.type === 'gamepaddisconnected'));
});

test('native gamepads take priority without duplicate connection events', async () => {
  const h = await shimHarness(() => [null, null, pad]);
  h.send(packed);
  assert.equal(h.navigator.getGamepads()[2], pad);
  assert.ok(!h.events.some(e => e.type === 'gamepadconnected'));
});

test('engines may poll inside a connection handler without recursive duplicate events', async () => {
  const h = await shimHarness();
  let calls = 0;
  h.window.addEventListener('gamepadconnected', () => { if (++calls === 1) h.navigator.getGamepads(); });
  h.send(packed);
  assert.equal(calls, 1);
});

test('malformed relay packets cannot create pads or keep buttons held', async () => {
  const h = await shimHarness();
  for (const data of [{ type: 'vyvanse:pads', v: 2, pads: [pad] }, { type: 'vyvanse:pads', v: 1, pads: [{ index: -1 }] },
    { type: 'vyvanse:pads', v: 1, pads: [{ ...pad, axes: ['oops'], buttons: [[1, 3]] }] }]) h.send(data);
  assert.equal(h.navigator.getGamepads().filter(Boolean).length, 0);
  h.send(packed);
  h.send({ type: 'vyvanse:pads', v: 1, pads: [{ ...pad, axes: ['invalid'], buttons: [[1, 3]] }] });
  assert.equal(h.navigator.getGamepads().filter(Boolean).length, 0, 'bad trusted input clears previously held buttons');
  h.send(packed);
  h.send({ type: 'vyvanse:pads', v: 1, pads: [] });
  assert.equal(h.navigator.getGamepads().filter(Boolean).length, 0);
});
