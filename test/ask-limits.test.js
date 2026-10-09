import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveBudget, LIMITS } from '../server/ask-limits.js';
import { startRedis } from './support/redis.js';

test('real Redis atomically enforces network and global limits across callers, failures and day boundaries',
  { skip: !process.env.REDIS_SERVER_BIN }, async t => {
    const redis = await startRedis();
    t.after(() => redis.stop());
    const env = { TYPESAFE_API_KEY: 'test-key', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test-token' };
    const fetch = async (_url, { body }) => Response.json({ result: await redis.command(JSON.parse(body)) });
    const reserve = (network = 'v4:192.0.2.1', now = 1000, inputTokens = 100) => reserveBudget({ env, network, now, inputTokens, fetch });
    const concurrent = await Promise.all(Array.from({ length: 40 }, () => reserve()));
    assert.equal(concurrent.filter(r => r.reason === 'ok').length, 6);
    assert.equal(concurrent.filter(r => r.reason === 'rate').length, 34);
    assert.equal((await reserve()).retryAfter, 59);
    assert.equal((await reserve('v4:192.0.2.1', 60_000)).reason, 'ok');
    const keys = await redis.command(['KEYS', 'vyv:{ask}:*']);
    assert.equal(await redis.command(['GET', keys.find(k => k.includes(':calls:'))]), '7');
    assert.equal(await redis.command(['GET', keys.find(k => k.includes(':tokens:'))]), '700');
    assert.ok(keys.every(k => !k.includes('192.0.2.1') && !k.includes('test-key')));

    await redis.command(['FLUSHDB']);
    for (let i = 0; i < 60; i++) assert.equal((await reserve('same-network', (Math.floor(i / 6) + 1) * 60_000)).reason, 'ok');
    assert.equal((await reserve('same-network', 12 * 60_000)).reason, 'rate');
    assert.equal((await reserve('other-network', 12 * 60_000)).reason, 'ok');

    await redis.command(['FLUSHDB']);
    const global = await Promise.all(Array.from({ length: 410 }, (_, i) => reserve('network-' + i)));
    assert.equal(global.filter(r => r.reason === 'ok').length, 400);
    assert.equal(global.filter(r => r.reason === 'budget').length, 10);
    assert.equal((await reserve('fresh-network', 86_400_000)).reason, 'ok');

    await redis.command(['FLUSHDB']);
    assert.equal((await reserve('first', 1000, LIMITS.dailyInputTokens)).reason, 'ok');
    assert.equal((await reserve('second', 1000, 1)).reason, 'budget');
    const tokenKeys = await redis.command(['KEYS', 'vyv:{ask}:*']);
    for (const key of tokenKeys) assert.ok(Number(await redis.command(['TTL', key])) > 0, 'counters expire without a cleanup cron');
  });

test("Vercel's Upstash integration env names (KV_REST_API_URL / KV_REST_API_TOKEN) are accepted", async () => {
  const env = { TYPESAFE_API_KEY: 'test-key', KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'kv-token' };
  let seen;
  const fetch = async (url, { headers }) => { seen = { url, auth: headers.Authorization }; return Response.json({ result: ['ok', 0] }); };
  const r = await reserveBudget({ env, network: 'v4:192.0.2.9', now: 1000, inputTokens: 10, fetch });
  assert.equal(r.reason, 'ok');
  assert.deepEqual(seen, { url: 'https://kv.example', auth: 'Bearer kv-token' });
});
