import assert from 'node:assert/strict';
import { createTicker } from '../src/ticker.js';

const saved = {
  document: globalThis.document,
  fetch: globalThis.fetch,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
};
const rows = Object.fromEntries(
  ['BTC', 'ETH', 'SOL', 'XRP'].map((sym) => [sym, { px: { textContent: '' }, ch: { textContent: '', className: '' } }]),
);
const tok = {
  px: { textContent: '' },
  ch: { textContent: '', className: '' },
  mc: { textContent: '' },
  line: { points: '', setAttribute(_k, v) { this.points = v; } },
  spark: { cls: new Set(), classList: { toggle: (c, on) => (on ? tok.spark.cls.add(c) : tok.spark.cls.delete(c)) } },
  href: '',
};
tok.spark.querySelector = () => tok.line;
tok.querySelector = (selector) => ({ '.ticker__px': tok.px, '.ticker__ch': tok.ch, '.ticker__mc': tok.mc, '.ticker__spark': tok.spark })[selector];
const CA = 'CSRRgTwf9o5KLgguS2M16aEAhV5PUUzfshrAAQ8opump';
const pair = (liq, priceUsd, url) => ({
  chainId: 'solana', baseToken: { address: CA }, priceUsd, marketCap: 1716978, url,
  liquidity: { usd: liq }, priceChange: { m5: 1.33, h1: 1.23, h6: 1.83, h24: 26.7 },
});
let refresh;
let fallback = false;
let dexDown = false;

try {
  globalThis.document = {
    hidden: false,
    createElement: () => ({
      setAttribute() {},
      querySelector: (selector) => selector === '.ticker__clock' ? { textContent: '', dateTime: '' } : rows[selector.match(/data-sym="(\w+)"/)?.[1]],
    }),
    querySelector: () => ({ prepend() {} }),
    addEventListener() {},
  };
  for (const row of Object.values(rows)) row.querySelector = (selector) => selector === '.ticker__px' ? row.px : row.ch;
  rows.RETARDIO = tok;
  globalThis.setTimeout = (fn, ms) => { if (ms === 60_000) refresh = fn; return 1; };
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async (url) => {
    if (fallback && url.includes('/simple/price')) throw Error('offline');
    if (url.includes('dexscreener')) {
      if (dexDown) throw Error('offline');
      return { ok: true, json: async () => ({ pairs: [
        pair(28, '0.0009', 'https://dexscreener.com/solana/thin'),
        pair(134916, '0.001775', 'https://dexscreener.com/solana/deep'),
      ] }) };
    }
    return {
      ok: true,
      json: async () => url.includes('/simple/price')
        ? { bitcoin: { usd: 83007, usd_24h_change: -1.24 }, ethereum: { usd: 2669, usd_24h_change: 0.04 }, solana: { usd: 117.56, usd_24h_change: -3.31 }, ripple: { usd: 1.48, usd_24h_change: 2.34 } }
        : { data: { amount: '1.50' } },
    };
  };

  createTicker();
  await new Promise(setImmediate);
  assert.equal(rows.BTC.px.textContent, '$83,007');
  assert.equal(rows.BTC.ch.textContent, ' ▼1.2%');
  assert.equal(rows.XRP.px.textContent, '$1.48');
  assert.equal(rows.XRP.ch.textContent, ' ▲2.3%');
  assert.equal(tok.px.textContent, '$0.001775');
  assert.equal(tok.mc.textContent, 'mc $1.72M');
  assert.equal(tok.ch.textContent, ' ▲26.7%');
  assert.equal(tok.ch.className, 'ticker__ch is-up');
  assert.equal(tok.href, 'https://dexscreener.com/solana/deep');
  assert.equal(tok.line.points.split(' ').length, 5);
  assert.ok(tok.spark.cls.has('is-up'));

  dexDown = true;
  fallback = true;
  await refresh();
  assert.equal(rows.XRP.px.textContent, '$1.50');
  assert.equal(rows.XRP.ch.textContent, '');
  assert.equal(rows.XRP.ch.className, 'ticker__ch');
  assert.equal(tok.px.textContent, '$0.001775'); // the last good quote stays up
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
}
