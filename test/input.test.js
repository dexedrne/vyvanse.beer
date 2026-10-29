import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function harness(phone = false, wheel = false) {
  const events = new Map();
  let timer;
  let pads = [];
  let now = 100;
  const root = { dataset: {} };
  const acts = [];
  const source = (await readFile(new URL('../src/input.js', import.meta.url), 'utf8')).replaceAll('export ', '');
  const context = vm.createContext({ acts, phone, wheel, document: { documentElement: root, querySelectorAll: () => [] },
    navigator: { getGamepads: () => pads }, matchMedia: () => ({ matches: true }), performance: { now: () => now }, Event,
    addEventListener: (n, fn) => events.set(n, fn), dispatchEvent() {},
    setInterval: fn => { timer = fn; return 1; }, clearInterval: () => { timer = null; } });
  vm.runInContext(`${source}\nglobalThis.input = createInput({ act: n => acts.push(n), mode: () => 'menu', phone: () => phone, wheel: () => wheel });`, context);
  const pad = { id: 'DualSense Wireless Controller', index: 0, connected: true, axes: [0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })) };
  return { key: (key,repeat=false) => events.get('keydown')({key,repeat,target:null,preventDefault(){}}), advance: ms => { now += ms; }, root, acts, input: context.input, pad, setPads: p => { pads = p; }, poll: () => timer?.(), touch: () => events.get('pointerdown')({ pointerType: 'touch' }) };
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

test('Options toggles music on a phone, while desktop retains Start', async () => {
  for (const phone of [true, false]) {
    const h = await harness(phone);
    h.setPads([h.pad]);
    h.pad.buttons[9] = { pressed: true, value: 1 };
    h.poll();
    h.pad.buttons[9] = { pressed: false, value: 0 };
    h.poll();
    assert.deepEqual(h.acts, [phone ? 'music' : 'start']);
  }
});

test('Create + Options never also toggles phone music', async () => {
  const h = await harness(true);
  h.setPads([h.pad]);
  h.pad.buttons[8] = h.pad.buttons[9] = { pressed: true, value: 1 };
  h.poll();
  h.pad.buttons[8] = h.pad.buttons[9] = { pressed: false, value: 0 };
  h.poll();
  assert.deepEqual(h.acts, []);
});


test('Cross exposes press and release phases and Triangle distinguishes tap from hold', async () => {
  const h=await harness();h.setPads([h.pad]);h.poll();
  h.pad.buttons[0]={pressed:true,value:1};h.poll();
  h.pad.buttons[0]={pressed:false,value:0};h.poll();
  assert.deepEqual(h.acts,['ok','ok-release']);h.acts.length=0;
  h.pad.buttons[3]={pressed:true,value:1};h.poll();h.advance(200);
  h.pad.buttons[3]={pressed:false,value:0};h.poll();
  assert.deepEqual(h.acts,['wall-cue','details']);h.acts.length=0;
  h.pad.buttons[3]={pressed:true,value:1};h.poll();h.advance(500);h.poll();
  h.pad.buttons[3]={pressed:false,value:0};h.poll();
  assert.deepEqual(h.acts,['wall-cue','wall-open','wall-close']);
});


test('keyboard held turns share the 160ms repeat interval',async()=>{
  const h=await harness();h.key('ArrowRight');h.advance(20);h.key('ArrowRight',true);h.advance(140);h.key('ArrowRight',true);h.advance(20);h.key('ArrowRight');
  assert.deepEqual(h.acts,['right','right','right']);
});
test('Options hold moves the phone wheel while a short tap keeps its existing action',async()=>{
  const h=await harness(true,true);h.setPads([h.pad]);h.pad.buttons[9]={pressed:true,value:1};h.poll();h.advance(451);h.poll();h.pad.buttons[9]={pressed:false,value:0};h.poll();
  assert.deepEqual(h.acts,['grab']);
});
