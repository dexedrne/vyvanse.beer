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
let refresh;
let fallback = false;

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
  globalThis.setTimeout = (fn, ms) => { if (ms === 60_000) refresh = fn; return 1; };
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async (url) => {
    if (fallback && url.includes('/simple/price')) throw Error('offline');
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

  fallback = true;
  await refresh();
  assert.equal(rows.XRP.px.textContent, '$1.50');
  assert.equal(rows.XRP.ch.textContent, '');
  assert.equal(rows.XRP.ch.className, 'ticker__ch');
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
}
