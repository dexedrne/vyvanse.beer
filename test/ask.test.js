import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIONS, CHIPS, plainAction, runAction, launchUrl } from '../src/ask/actions.js';
import { projects, crew } from '../src/projects.js';
import { makePayload, routeAnswer, parseInput, createAskHandler } from '../server/ask.js';
import { networkAddress } from '../server/ask-limits.js';
import { replayAnswer } from './support/recording.js';

function answer(choice, confidence, probabilities = { [choice]: 1 }) {
  return { answers: { action: { type: 'choice', choice, confidence,
    probabilities: Object.fromEntries(ACTIONS.map(a => [a.id, probabilities[a.id] || 0])) } } };
}
const req = (body, headers = {}) => ({ method: 'POST', body, headers: {
  'content-type': 'application/json', 'x-vercel-forwarded-for': '2001:db8:1:2::1', ...headers } });
function response() {
  return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
}

test('the closed catalogue covers projects, editions and only their real cast', () => {
  assert.ok(ACTIONS.length <= 255);
  assert.equal(new Set(ACTIONS.map(a => a.id)).size, ACTIONS.length);
  for (const p of projects) {
    assert.ok(ACTIONS.some(a => a.id === `play:${p.cmd}`));
    for (const num of p.cast || []) assert.ok(ACTIONS.some(a => a.id === `play:${p.cmd}:${num}`));
  }
  assert.ok(!ACTIONS.some(a => a.id === 'play:pokerbros:2564'));
  assert.equal(ACTIONS.find(a => a.id === 'crew:555').line, crew.members.find(m => m.num === '555').line);
  assert.equal(plainAction('zombies as 85'), 'play:zombietardio:85');
  assert.equal(plainAction('the one with the miata'), 'crew:555');
  assert.equal(plainAction('anything with fast cars please'), null);
  assert.ok(CHIPS.length >= 4 && CHIPS.length <= 6);
  assert.equal(Object.keys(makePayload('hello').questions).join(), 'action');
  assert.deepEqual(Object.keys(makePayload('hello').questions.action.criteria), ACTIONS.map(a => a.id));
});

test('confidence and winning probability both gate execution; uncertainty returns exactly the top three', () => {
  assert.equal(routeAnswer(answer('play:zombietardio:85', 0.91)).action, 'play:zombietardio:85');
  const uncertain = answer('play:radzombies', 0.72,
    { 'play:radzombies': 0.45, 'play:zombietardio': 0.35, 'play:shitbox': 0.2 });
  const result = routeAnswer(uncertain);
  assert.equal(result.action, null);
  assert.deepEqual(result.suggestions.map(s => s.action), ['play:radzombies', 'play:zombietardio', 'play:shitbox']);
  assert.equal(routeAnswer(answer('play:radzombies', 0.99,
    { 'play:radzombies': 0.55, 'play:shitbox': 0.45 })).action, null);
  assert.equal(routeAnswer(answer('none', 1)).action, 'none');
  for (const bad of [answer('invented', 1), answer('play:radzombies', NaN),
    answer('play:radzombies', 1, { 'play:shitbox': 1 }), { answers: { action: { choice: 'contact', confidence: 1 } } }]) {
    assert.equal(routeAnswer(bad), null);
  }
  const injected = answer('contact', 1);
  injected.answers.action.line = '<script>steal secrets</script>';
  assert.equal(routeAnswer(injected).line, ACTIONS.find(a => a.id === 'contact').line);
});

test('input strips control and markup characters, rejects empty, oversize and nontext bodies', () => {
  assert.equal(parseInput({ text: '  zombies\n as\u0000 <85>\u202e ' }), 'zombies as 85');
  assert.equal(parseInput({ text: 'a'.repeat(200) }).length, 200);
  for (const body of [{ text: 'a'.repeat(201) }, { text: '😀'.repeat(201) }, { text: [] },
    { text: '' }, { text: '\u0000  ' }, null, { text: 'x', action: 'contact' }]) assert.equal(parseInput(body), null);
});

test('launches keep the original project and append as only when supported, preserving phone and other parameters', () => {
  const calls = [];
  const shell = { play: (p, opts) => calls.push([p, opts]), reveal: slug => calls.push(slug) };
  runAction('play:zombietardio:85', shell);
  assert.equal(calls[0][0], projects.find(p => p.cmd === 'zombietardio'));
  assert.equal(calls[0][1].as, '85');
  runAction('crew:555', shell);
  assert.equal(calls[1], 'retardio-555');
  assert.equal(runAction('play:pokerbros:2564', shell), false);
  const phone = { userAgent: 'iPhone', maxTouchPoints: 5 };
  const supported = { url: 'https://game.example/?mode=coop#menu', asParam: true, cast: ['85'] };
  const url = new URL(launchUrl(supported, '85', phone));
  assert.equal(url.searchParams.get('as'), '85');
  assert.equal(url.searchParams.get('device'), 'phone');
  assert.equal(url.searchParams.get('mode'), 'coop');
  assert.equal(url.hash, '#menu');
  assert.equal(new URL(launchUrl({ ...supported, asParam: false }, '85', phone)).searchParams.has('as'), false);
  assert.equal(new URL(launchUrl(supported, '555', phone)).searchParams.has('as'), false);
  assert.equal(new URL(launchUrl(supported, '85', { userAgent: 'Desktop' })).searchParams.has('device'), false);
});

test('IPv6 /64, canonical IPv4 and IPv4-mapped addresses share the appropriate network bucket', () => {
  assert.equal(networkAddress('2001:db8:1:2::1'), networkAddress('2001:0db8:1:2:abcd::55'));
  assert.notEqual(networkAddress('2001:db8:1:2::1'), networkAddress('2001:db8:1:3::1'));
  assert.equal(networkAddress('::ffff:192.0.2.4'), networkAddress('192.0.2.4'));
  for (const bad of ['', '192.0.2.4, 192.0.2.5', '2001:db8::x', '300.2.2.2', 'local']) assert.equal(networkAddress(bad), null);
});

test('a missing key or budget store falls back without sending text to the provider', async () => {
  for (const env of [{}, { TYPESAFE_API_KEY: 'test-only-secret' }]) {
    const res = response();
    await createAskHandler({ env, fetch: () => { throw Error('network must stay unused'); } })(req({ text: 'zombies as 85' }), res);
    assert.equal(res.body.action, 'play:zombietardio:85');
    assert.ok(res.body.line.includes('exact commands'));
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.ok(!JSON.stringify(res.body).includes('test-only-secret'));
  }
});

test('server uses the trusted Vercel network header, reserves before inference and returns only authored results', async () => {
  const env = { TYPESAFE_API_KEY: 'test-only-secret', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-redis' };
  const calls = [];
  const handler = createAskHandler({ env, now: () => 12_345, fetch: async (url, opts) => {
    calls.push({ url, opts });
    return Response.json(url === env.UPSTASH_REDIS_REST_URL ? { result: ['ok', 0] } : answer('crew:555', 1));
  } });
  const res = response();
  await handler(req({ text: 'the fellow with a miata' }, { 'x-forwarded-for': 'attacker-controlled' }), res);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://redis.example');
  assert.equal(calls[1].url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(calls[1].opts.headers.Authorization, 'Bearer test-only-secret');
  assert.equal(res.body.action, 'crew:555');
  assert.deepEqual(Object.keys(res.body), ['action', 'line']);
  assert.ok(!JSON.stringify(calls[0].opts.body).includes('2001:db8'));
  const missing = response();
  await handler(req({ text: 'please pick a game' }, { 'x-vercel-forwarded-for': undefined }), missing);
  assert.equal(calls.length, 2, 'client-supplied forwarding headers cannot bypass the limiter');
  assert.equal(missing.body.action, null);
});

test('rate and budget refusals, bad provider answers and timeouts keep a plain-code path', async () => {
  const env = { TYPESAFE_API_KEY: 'test-only-secret', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-redis' };
  for (const reason of ['rate', 'budget', 'unavailable']) {
    let providerCalls = 0;
    const handler = createAskHandler({ env, fetch: async url => {
      if (url === env.UPSTASH_REDIS_REST_URL) return Response.json({ result: [reason, 42] });
      providerCalls++; throw Error('must not call provider');
    } });
    const res = response();
    await handler(req({ text: 'please play a zombie thing' }), res);
    assert.equal(providerCalls, 0);
    assert.equal(res.body.action, null);
    assert.equal(res.body.suggestions.length, 3);
  }
  for (const fail of [() => Response.json({ answers: { action: { choice: 'javascript:alert(1)' } } }),
    () => { throw Error('timeout including test-only-secret'); }]) {
    const handler = createAskHandler({ env, fetch: async url => url === env.UPSTASH_REDIS_REST_URL ? Response.json({ result: ['ok', 0] }) : fail() });
    const res = response();
    await handler(req({ text: 'zombies as #85' }), res);
    assert.equal(res.body.action, 'play:zombietardio:85');
    assert.ok(!JSON.stringify(res.body).includes('test-only-secret'));
  }
});

test('HTTP boundary rejects invalid methods, content types and large bodies before any network work', async () => {
  const handler = createAskHandler({ env: {}, fetch: () => { throw Error('network must stay unused'); } });
  for (const [request, status] of [[{ ...req({ text: 'hello' }), method: 'GET' }, 405],
    [req({ text: 'hello' }, { 'content-type': 'text/plain' }), 415],
    [req({ text: 'hello' }, { 'content-length': '4096' }), 413], [req({ text: 'x'.repeat(201) }), 400],
    [req('{broken JSON'), 400]]) {
    const res = response(); await handler(request, res); assert.equal(res.statusCode, status);
  }
});

test('recorded Jev smoke answer routes without a live call', () => {
  const recorded = JSON.parse(readFileSync(new URL('./fixtures/ask-recorded.json', import.meta.url)));
  assert.equal(recorded.text, 'zombies as 85');
  assert.equal(routeAnswer(replayAnswer(recorded)).action, 'play:zombietardio:85');
});
