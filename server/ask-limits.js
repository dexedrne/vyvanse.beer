import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export const LIMITS = { minute: 6, networkDay: 60, dailyCalls: 400, dailyInputTokens: 2_000_000 };
const MINUTE = 60_000, DAY = 86_400_000;

export function networkAddress(ip) {
  if (typeof ip !== 'string' || ip.length > 64 || !isIP(ip) || ip.includes('%')) return null;
  if (isIP(ip) === 4) return 'v4:' + ip;
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left, right] = canonical.split('::');
  const head = left ? left.split(':') : [], tail = right ? right.split(':') : [];
  const words = [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail].map(w => parseInt(w, 16));
  if (words.slice(0, 5).every(w => w === 0) && words[5] === 0xffff)
    return 'v4:' + [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join('.');
  return 'v6:' + words.slice(0, 4).map(w => w.toString(16)).join(':') + '/64';
}

// shortcut: fixed minute/day windows can burst at reset; use rolling windows if traffic warrants it.
export const RESERVE_SCRIPT = `
local minute = tonumber(redis.call('GET', KEYS[1]) or '0')
local networkDay = tonumber(redis.call('GET', KEYS[2]) or '0')
local calls = tonumber(redis.call('GET', KEYS[3]) or '0')
local tokens = tonumber(redis.call('GET', KEYS[4]) or '0')
if calls >= tonumber(ARGV[3]) or tokens + tonumber(ARGV[5]) > tonumber(ARGV[4]) then
  return {'budget', ARGV[7]}
end
if networkDay >= tonumber(ARGV[2]) then return {'rate', ARGV[7]} end
if minute >= tonumber(ARGV[1]) then return {'rate', ARGV[6]} end
for i = 1, 3 do redis.call('INCR', KEYS[i]) end
redis.call('INCRBY', KEYS[4], ARGV[5])
redis.call('EXPIRE', KEYS[1], ARGV[6])
for i = 2, 4 do redis.call('EXPIRE', KEYS[i], ARGV[7]) end
return {'ok', 0}
`;

export async function reserveBudget({ env, network, inputTokens, now = Date.now(), fetch: send = globalThis.fetch }) {
  // Upstash's own names, or the names Vercel's Upstash marketplace integration sets.
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken || !network) return { reason: 'unavailable' };
  const bucket = createHmac('sha256', env.TYPESAFE_API_KEY).update(network).digest('hex');
  const prefix = 'vyv:{ask}:';
  const minute = Math.floor(now / MINUTE), day = Math.floor(now / DAY);
  const minuteTTL = Math.ceil(((minute + 1) * MINUTE - now) / 1000);
  const dayTTL = Math.ceil(((day + 1) * DAY - now) / 1000);
  try {
    const response = await send(redisUrl, { method: 'POST',
      headers: { Authorization: 'Bearer ' + redisToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', RESERVE_SCRIPT, 4,
        `${prefix}net:${bucket}:m:${minute}`, `${prefix}net:${bucket}:d:${day}`, `${prefix}calls:${day}`, `${prefix}tokens:${day}`,
        LIMITS.minute, LIMITS.networkDay, LIMITS.dailyCalls, LIMITS.dailyInputTokens, inputTokens, minuteTTL, dayTTL]),
      signal: AbortSignal.timeout(2000) });
    if (!response.ok) return { reason: 'unavailable' };
    const { result } = await response.json();
    if (!Array.isArray(result) || !['ok', 'rate', 'budget'].includes(result[0])) return { reason: 'unavailable' };
    return { reason: result[0], retryAfter: Number(result[1]) || 0 };
  } catch { return { reason: 'unavailable' }; }
}
