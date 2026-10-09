import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, crew, site, groups, contact } from '../src/projects.js';
import { requestAsk } from '../src/ask/client.js';
import { LINES, BY_ID } from '../src/ask/actions.js';

// The terminal builds DOM output; its network and launcher boundaries stay real code.
class Element {
  children = [];
  setAttribute() {}
  addEventListener() {}
  append(...kids) { this.children.push(...kids); }
}
globalThis.Node = Element;
globalThis.document = { createElement: () => new Element(), createTextNode: text => text };
globalThis.matchMedia = () => ({ matches: true });
Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
const { createCommands } = await import('../src/os/commands.js');

test('offline chips and exact commands do not make a request; unmatched text gets a polite fallback', async t => {
  t.mock.getter(globalThis.navigator, 'onLine', () => false);
  t.mock.method(globalThis, 'fetch', () => { throw Error('offline network call'); });
  assert.equal((await requestAsk('zombies as 85')).action, 'play:zombietardio:85');
  assert.equal((await requestAsk('unknown thing')).line, LINES.offline);
});

test('client rejects arbitrary provider prose, unknown actions and oversized suggestions', async t => {
  t.mock.getter(globalThis.navigator, 'onLine', () => true);
  for (const result of [{ action: 'contact', line: 'made up answer' },
    { action: 'evil', line: LINES.uncertain }, { action: null, line: LINES.uncertain,
      suggestions: Array(4).fill({ action: 'contact', line: BY_ID.get('contact').line }) }]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(result));
    assert.equal((await requestAsk('tell me about somebody')).line, LINES.unavailable);
  }
});

test('exact terminal commands stay local, and invalid arguments or plain words use the ask endpoint', async t => {
  t.mock.getter(globalThis.navigator, 'onLine', () => true);
  let requests = 0;
  const reveals = [], music = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests++; assert.equal(url, '/api/ask');
    assert.deepEqual(Object.keys(JSON.parse(options.body)), ['text']);
    return Response.json({ action: 'crew:555', line: BY_ID.get('crew:555').line });
  });
  const commands = createCommands({ projects, crew, site, groups, contact,
    term: { print() {}, history: () => [] }, shell: { reveal: slug => reveals.push(slug), music: on => music.push(on) } });
  await commands.run('info 555');
  await commands.run('music off');
  assert.equal(requests, 0);
  assert.deepEqual(music, [false]);
  await commands.run('the one with a miata');
  await commands.run('open the zombie game please');
  await commands.run('constructor');
  assert.equal(requests, 3);
  assert.ok(reveals.every(slug => slug === 'retardio-555'));
});

test('a cancelled terminal ask cannot launch after another command or after closing', async t => {
  t.mock.getter(globalThis.navigator, 'onLine', () => true);
  let reply;
  const reveals = [];
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { reply = resolve; }));
  const commands = createCommands({ projects, crew, site, groups, contact,
    term: { print() {}, history: () => [] }, shell: { reveal: slug => reveals.push(slug) } });
  const pending = commands.run('show the miata fellow');
  await commands.run('info 85');
  reply(Response.json({ action: 'crew:555', line: BY_ID.get('crew:555').line }));
  await pending;
  assert.deepEqual(reveals, ['retardio-85']);
  const closing = commands.run('show the miata fellow');
  commands.cancel();
  reply(Response.json({ action: 'crew:555', line: BY_ID.get('crew:555').line }));
  await closing;
  assert.deepEqual(reveals, ['retardio-85']);
});
