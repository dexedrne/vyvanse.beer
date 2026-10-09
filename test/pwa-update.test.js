import test from 'node:test';
import assert from 'node:assert/strict';

test('a requested update cannot reload a game launched before worker activation', async () => {
  const { createUpdateGate } = await import('../src/pwa.js');
  assert.equal(typeof createUpdateGate, 'function');
  let playing = false;
  let reloads = 0;
  const gate = createUpdateGate({ playing: () => playing, reload: () => { reloads++; } });
  gate.activated();
  assert.equal(reloads, 0, 'a background worker activation does not reload');
  gate.request();
  playing = true;
  gate.activated();
  assert.equal(reloads, 0, 'game started while activation was pending');
  assert.equal(gate.resume(), false);
  playing = false;
  assert.equal(gate.resume(), true);
  assert.equal(reloads, 1);
  assert.equal(gate.resume(), false, 'reload runs once');
});

test('an update in another window reloads old clients only after play ends', async () => {
  const { createUpdateGate } = await import('../src/pwa.js');
  let playing = true;
  let reloads = 0;
  const gate = createUpdateGate({ playing: () => playing, reload: () => { reloads++; } });
  gate.activated(true); // an existing controller was replaced, without this window requesting it
  assert.equal(reloads, 0);
  playing = false;
  assert.equal(gate.resume(), true);
  assert.equal(reloads, 1);
});
