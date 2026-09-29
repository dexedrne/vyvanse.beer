// The strip in the top-left corner: the UTC clock and live BTC / ETH / SOL / XRP. Prices come from
// CoinGecko's public price API (Coinbase's spot prices if that fails), once a minute while the tab
// is visible; the last good prices stay up when a fetch fails. JS only: without it there is no strip.

const COINS = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'ripple', sym: 'XRP' },
];
const GECKO = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.map((c) => c.id).join(',')}&vs_currencies=usd&include_24hr_change=true`;
const EVERY = 60_000;

const usd = (n) =>
  n >= 1000
    ? `$${Math.round(n).toLocaleString('en-US')}`
    : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function createTicker() {
  const el = document.createElement('div');
  el.className = 'ticker';
  el.setAttribute('aria-label', 'UTC time and live crypto prices');
  el.innerHTML =
    `<span class="ticker__item"><span class="ticker__k">UTC</span> <time class="ticker__clock">--:--:--</time></span>` +
    COINS.map(
      (c) =>
        `<span class="ticker__item" data-sym="${c.sym}"><span class="ticker__k">${c.sym}</span> <span class="ticker__px">…</span><span class="ticker__ch"></span></span>`,
    ).join('');
  // in the page column, so the strip never sits over Radbro OS when it's docked beside the page
  (document.querySelector('.page') || document.body).prepend(el);

  const clock = el.querySelector('.ticker__clock');
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toISOString().slice(11, 19);
    clock.dateTime = now.toISOString();
    setTimeout(tick, 1000 - (now.getTime() % 1000));
  };
  tick();

  const rows = COINS.map((c) => el.querySelector(`[data-sym="${c.sym}"]`));
  let last = 0;
  let timer = 0;
  const refresh = async () => {
    clearTimeout(timer);
    if (document.hidden) return;
    last = Date.now();
    const got = await prices().catch(() => []);
    got.forEach((p, i) => {
      if (!Number.isFinite(p?.px)) return;
      const row = rows[i];
      row.querySelector('.ticker__px').textContent = usd(p.px);
      const ch = row.querySelector('.ticker__ch');
      if (Number.isFinite(p.ch)) {
        ch.textContent = ` ${p.ch >= 0 ? '▲' : '▼'}${Math.abs(p.ch).toFixed(1)}%`;
        ch.className = `ticker__ch ${p.ch >= 0 ? 'is-up' : 'is-down'}`;
      }
    });
    timer = setTimeout(refresh, EVERY);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - last >= EVERY) refresh();
    else if (!document.hidden && !timer) timer = setTimeout(refresh, EVERY - (Date.now() - last));
  });
  refresh();
}
