// The ticker in the strip along the bottom: the UTC clock, live BTC / ETH / SOL / XRP and RETARDIO. Prices
// come from CoinGecko's public price API (Coinbase's spot prices if that fails), RETARDIO's from
// DexScreener's (its deepest pool), once a minute while the tab is visible; the last good prices
// stay up when a fetch fails. JS only: without it there is no strip.

const COINS = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'ripple', sym: 'XRP' },
];
const GECKO = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.map((c) => c.id).join(',')}&vs_currencies=usd&include_24hr_change=true`;
const EVERY = 60_000;

// RETARDIO (Solana), linked to its main pool on DexScreener. No key, no tracking.
const TOKEN = {
  sym: 'RETARDIO',
  ca: 'CSRRgTwf9o5KLgguS2M16aEAhV5PUUzfshrAAQ8opump',
  pair: 'https://dexscreener.com/solana/98ewlhskoxmu9g9ngumykjgufz2rc8wsrscxb67bmubh',
};
const DEX = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN.ca}`;
// the sparkline's points: DexScreener's own changes, read back to prices (oldest first)
const SPARK = ['h24', 'h6', 'h1', 'm5'];

const usd = (n) =>
  n >= 1000
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// small prices keep four significant digits ($0.001777), market caps go compact ($1.72M)
const tiny = (n) => (n >= 1 ? usd(n) : `$${n.toLocaleString('en-US', { maximumSignificantDigits: 4 })}`);
const compact = (n) =>
  `$${n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: n >= 1e6 ? 2 : 1 })}`;

async function getJson(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function prices() {
  try {
    const j = await getJson(GECKO);
    return COINS.map((c) => ({ px: j[c.id]?.usd, ch: j[c.id]?.usd_24h_change }));
  } catch {
    // no 24 h change from this one
    const spot = await Promise.all(
      COINS.map((c) =>
        getJson(`https://api.coinbase.com/v2/prices/${c.sym}-USD/spot`)
          .then((j) => ({ px: Number(j?.data?.amount) }))
          .catch(() => ({})),
      ),
    );
    return spot;
  }
}

// the deepest Solana pool for the token, as { px, mc, ch, spark, url }
async function token() {
  const j = await getJson(DEX);
  const pairs = (j?.pairs || []).filter(
    (p) => p?.chainId === 'solana' && p?.baseToken?.address === TOKEN.ca && Number(p?.priceUsd) > 0,
  );
  if (!pairs.length) throw new Error('no pair');
  const p = pairs.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
  const px = Number(p.priceUsd);
  const ch = p.priceChange || {};
  const spark = SPARK.filter((k) => Number.isFinite(ch[k]) && ch[k] > -100).map((k) => px / (1 + ch[k] / 100));
  return {
    px,
    mc: Number(p.marketCap ?? p.fdv),
    ch: Number(ch.h24),
    spark: [...spark, px],
    url: typeof p.url === 'string' && p.url.startsWith('https://dexscreener.com/') ? p.url : TOKEN.pair,
  };
}

// a 40×12 polyline through the points, scaled to fill the box
function sparkPath(points) {
  const lo = Math.min(...points);
  const span = Math.max(...points) - lo || 1;
  const step = 40 / (points.length - 1);
  return points.map((v, i) => `${(i * step).toFixed(1)},${(11 - ((v - lo) / span) * 10).toFixed(1)}`).join(' ');
}

const change = (node, ch) => {
  if (Number.isFinite(ch)) {
    node.textContent = ` ${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(1)}%`;
    node.className = `ticker__ch ${ch >= 0 ? 'is-up' : 'is-down'}`;
  } else {
    node.textContent = '';
    node.className = 'ticker__ch';
  }
};

export function createTicker(host = document.querySelector('#ticker-host')) {
  const el = document.createElement('div');
  el.className = 'ticker';
  el.setAttribute('aria-label', 'UTC time and live crypto prices');
  el.innerHTML =
    `<span class="ticker__item ticker__time"><span class="ticker__k">UTC</span> <time class="ticker__clock">--:--:--</time></span>` +
    COINS.map(
      (c) =>
        `<span class="ticker__item" data-sym="${c.sym}"><span class="ticker__k">${c.sym}</span> <span class="ticker__px">…</span><span class="ticker__ch"></span></span>`,
    ).join('') +
    `<a class="ticker__item ticker__tok" data-sym="${TOKEN.sym}" href="${TOKEN.pair}" target="_blank" rel="noopener" ` +
    `title="${TOKEN.sym} on DexScreener: price, market cap and 24 h change">` +
    `<span class="ticker__k">${TOKEN.sym}</span> <span class="ticker__px">…</span>` +
    `<span class="ticker__mc"></span><span class="ticker__ch"></span>` +
    `<svg class="ticker__spark" viewBox="0 0 40 12" aria-hidden="true" focusable="false"><polyline points="" /></svg></a>`;
  (host || document.body).prepend(el);

  const clock = el.querySelector('.ticker__clock');
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toISOString().slice(11, 19);
    clock.dateTime = now.toISOString();
    setTimeout(tick, 1000 - (now.getTime() % 1000));
  };
  tick();

  const rows = COINS.map((c) => el.querySelector(`[data-sym="${c.sym}"]`));
  const tok = el.querySelector(`[data-sym="${TOKEN.sym}"]`);
  let last = 0;
  let timer = 0;
  const refresh = async () => {
    clearTimeout(timer);
    if (document.hidden) return;
    last = Date.now();
    const [got, t] = await Promise.all([prices().catch(() => []), token().catch(() => null)]);
    got.forEach((p, i) => {
      if (!Number.isFinite(p?.px)) return;
      const row = rows[i];
      row.querySelector('.ticker__px').textContent = usd(p.px);
      change(row.querySelector('.ticker__ch'), p.ch);
    });
    if (t && tok) {
      tok.querySelector('.ticker__px').textContent = tiny(t.px);
      tok.querySelector('.ticker__mc').textContent = Number.isFinite(t.mc) && t.mc > 0 ? `mc ${compact(t.mc)}` : '';
      change(tok.querySelector('.ticker__ch'), t.ch);
      tok.href = t.url;
      const spark = tok.querySelector('.ticker__spark');
      spark.classList.toggle('is-up', !(t.ch < 0));
      spark.classList.toggle('is-down', t.ch < 0);
      spark.querySelector('polyline').setAttribute('points', t.spark.length > 1 ? sparkPath(t.spark) : '');
    }
    timer = setTimeout(refresh, EVERY);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - last >= EVERY) refresh();
    else if (!document.hidden && !timer) timer = setTimeout(refresh, EVERY - (Date.now() - last));
  });
  refresh();
}
