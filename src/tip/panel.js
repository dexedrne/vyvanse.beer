// The tip jar: SOL to vyvanse.sol, or ETH on Ethereum, Arbitrum or Robinhood Chain. A modal
// <dialog> with the address (to check against your wallet), quick amounts, a payment link and
// its QR for phone wallets, and "connect wallet & send" for browser wallets. Loaded on first
// use (src/tip/open.js); the wallet code (sol.js, evm.js) loads only when it's needed.
import { encode } from 'uqr';
import { h, icon } from '../dom.js';
import { sol, eth, toUnits, fromUnits, short, payLink, why } from './config.js';
import './tip.css';

const loadSol = () => import('./sol.js');
const loadEvm = () => import('./evm.js');

const state = {
  coin: 'SOL',
  chain: eth.chains[0],
  amt: { SOL: sol.pick, ETH: eth.pick },
  busy: false,
  live: null, // the SNS re-check: null while it runs, then { state: 'ok' | 'changed' | 'unknown' }
};
const cfg = () => (state.coin === 'SOL' ? sol : eth);
const units = () => toUnits(state.amt[state.coin], cfg().decimals);
const blocked = () => state.coin === 'SOL' && state.live?.state === 'changed';

let dlg;
let ui;

const COPY = '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 3.5v-.4A1.6 1.6 0 0 0 8.9 1.5H3.1A1.6 1.6 0 0 0 1.5 3.1v5.8a1.6 1.6 0 0 0 1.6 1.6h.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

function qr(text) {
  const { data, size } = encode(text, { ecc: 'M', border: 2 });
  let d = '';
  data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)));
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${size}" height="${size}" fill="#f4f0fb"/><path d="${d}" fill="#140d24"/></svg>`;
}

function seg(label, items, onPick) {
  return h(
    'div',
    { class: 'tip__seg', role: 'group', 'aria-label': label },
    items.map(([key, text]) => h('button', { type: 'button', 'data-k': key, 'aria-pressed': 'false', onclick: () => onPick(key) }, text)),
  );
}

function build() {
  const amtBtns = h('div', { class: 'tip__amts', role: 'group', 'aria-label': 'Amount' });
  ui = {
    coins: seg('Coin', [['SOL', 'SOL'], ['ETH', 'ETH']], (k) => {
      state.coin = k;
      status('');
      render();
    }),
    chains: seg('Network', eth.chains.map((c) => [c.key, c.label]), (k) => {
      state.chain = eth.chains.find((c) => c.key === k);
      status('');
      render();
    }),
    name: h('strong', { class: 'tip__name' }),
    addr: h('button', { class: 'tip__addr', type: 'button', onclick: copy }),
    full: h('code', { class: 'tip__full' }),
    check: h('span', { class: 'tip__check' }),
    amtBtns,
    custom: h('input', {
      class: 'tip__custom',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'custom',
      'aria-label': 'Custom amount',
      oninput: (e) => {
        state.amt[state.coin] = e.target.value;
        render({ typing: true });
      },
    }),
    unit: h('span', { class: 'tip__unit' }),
    qr: h('div', { class: 'tip__qr' }),
    send: h('button', { class: 'btn tip__send', type: 'button', onclick: go }),
    link: h('a', { class: 'btn tip__link' }, 'open in wallet app'),
    hint: h('p', { class: 'tip__hint' }),
    wallets: h('div', { class: 'tip__wallets', hidden: true }),
    status: h('p', { class: 'tip__status', role: 'status', 'aria-live': 'polite' }),
  };

  dlg = h(
    'dialog',
    { class: 'tip', 'aria-labelledby': 'tip-title' },
    h(
      'div',
      { class: 'tip__in', tabindex: '-1', autofocus: true },
      h('button', { class: 'tip__close', type: 'button', 'aria-label': 'Close tip jar', onclick: () => dlg.close() }, icon('close')),
      h('h2', { class: 'tip__title', id: 'tip-title' }, 'tip ', h('span', {}, 'vyvanse'), h('em', {}, '.sol')),
      h('p', { class: 'tip__lede' }, 'If something here made your day. SOL goes to vyvanse.sol, ETH to one wallet on all three networks. Thank you!'),
      h('div', { class: 'tip__pick' }, ui.coins, ui.chains),
      h('div', { class: 'tip__to' }, h('span', { class: 'tip__k' }, 'to'), ui.name, ui.addr),
      h('p', { class: 'tip__verify' }, ui.full, ui.check),
      h('div', { class: 'tip__amtrow' }, amtBtns, h('label', { class: 'tip__customwrap' }, ui.custom, ui.unit)),
      h('div', { class: 'tip__pay' }, ui.qr, h('div', { class: 'tip__acts' }, ui.send, ui.link, ui.hint)),
      ui.wallets,
      ui.status,
      h('p', { class: 'tip__small' }, 'Your wallet shows the address and amount before anything moves. No accounts, no tracking, no fees to this site.'),
    ),
  );
  // a click on the backdrop (the dialog itself, outside .tip__in) closes it
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('close', () => location.hash === '#tip' && history.replaceState(null, '', location.pathname + location.search));
  document.body.append(dlg);

  loadSol()
    .then((m) => m.recheck())
    .catch(() => ({ state: 'unknown' }))
    .then((r) => {
      state.live = r;
      render();
    });
}

function render({ typing } = {}) {
  const c = cfg();
  const isSol = state.coin === 'SOL';
  const amt = state.amt[state.coin];
  const u = units();

  for (const b of ui.coins.children) b.setAttribute('aria-pressed', String(b.dataset.k === state.coin));
  for (const b of ui.chains.children) b.setAttribute('aria-pressed', String(b.dataset.k === state.chain.key));
  ui.chains.hidden = isSol;

  ui.name.textContent = isSol ? sol.name : state.chain.label;
  ui.addr.innerHTML = `<span>${short(c.address)}</span>${COPY}`;
  ui.addr.setAttribute('aria-label', `Copy address ${c.address}`);
  ui.addr.title = 'Copy address';
  ui.full.textContent = c.address;
  ui.check.className = 'tip__check';
  if (!isSol) ui.check.textContent = 'same address on Ethereum, Arbitrum and Robinhood Chain';
  else if (!state.live) ui.check.textContent = 'checking vyvanse.sol live…';
  else if (state.live.state === 'ok') {
    ui.check.textContent = '✓ vyvanse.sol resolves here, checked live just now';
    ui.check.classList.add('is-ok');
  } else if (state.live.state === 'changed') {
    ui.check.textContent = `Heads up: ${state.live.note}, which isn’t the address above. Sending is off until this page is updated. DM @dexedrne.`;
    ui.check.classList.add('is-warn');
  } else ui.check.textContent = 'couldn’t re-check vyvanse.sol live just now; the address above is the one it resolved to';

  ui.amtBtns.replaceChildren(
    ...c.amounts.map((a) =>
      h('button', {
        type: 'button',
        'aria-pressed': String(a === amt),
        onclick: () => {
          state.amt[state.coin] = a;
          render();
        },
      }, a),
    ),
  );
  if (!typing) ui.custom.value = c.amounts.includes(amt) ? '' : amt;
  ui.custom.setAttribute('aria-invalid', String(!!amt && !c.amounts.includes(amt) && !u));
  ui.unit.textContent = c.coin;

  const shown = u ? fromUnits(u, c.decimals) : null;
  const link = payLink(state.coin, shown || '', state.chain);
  ui.qr.innerHTML = qr(link);
  ui.qr.classList.toggle('is-off', blocked());
  ui.qr.setAttribute('role', 'img');
  ui.qr.setAttribute('aria-label', `QR code: ${shown || 'any amount of'} ${c.coin} to ${c.address}${isSol ? '' : ` on ${state.chain.label}`}`);

  if (blocked()) ui.link.removeAttribute('href');
  else ui.link.href = link;
  ui.link.setAttribute('aria-disabled', String(blocked()));
  ui.send.disabled = state.busy || !u || blocked();
  ui.send.textContent = state.busy ? 'waiting on your wallet…' : `connect wallet & send${shown ? ` ${shown} ${c.coin}` : ''}`;

  // On a phone with no wallet built into the browser, the link is the way: it opens the app.
  const injected = !!(window.ethereum || window.solana || window.phantom || window.solflare || window.backpack);
  const phone = matchMedia('(pointer: coarse)').matches && !injected;
  ui.send.classList.toggle('btn--primary', !phone);
  ui.link.classList.toggle('btn--primary', phone);
  ui.hint.textContent = phone
    ? 'Opens your wallet app with the tip filled in. Or scan the code from another phone.'
    : `Or scan the code with a phone wallet${isSol ? ' (Phantom, Solflare, Backpack)' : ` (MetaMask, Rabby, Robinhood Wallet) on ${state.chain.label}`}.`;
}

function status(text, { kind = '', url, label } = {}) {
  ui.status.className = `tip__status${kind ? ` is-${kind}` : ''}`;
  ui.status.replaceChildren(text);
  if (url) ui.status.append(' ', h('a', { href: url, target: '_blank', rel: 'noopener' }, `view on ${label} ↗`));
}

async function copy() {
  const a = cfg().address;
  try {
    await navigator.clipboard.writeText(a);
    status('Address copied.');
  } catch {
    const r = document.createRange();
    r.selectNodeContents(ui.full);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    status('Couldn’t reach the clipboard; the address is selected, copy it from there.');
  }
}

async function go() {
  const u = units();
  if (!u || state.busy || blocked()) return;
  const isSol = state.coin === 'SOL';
  let m;
  try {
    m = await (isSol ? loadSol() : loadEvm());
  } catch {
    status('Couldn’t load the wallet code. Check your connection and try again.', { kind: 'err' });
    return;
  }
  const list = m.wallets();
  ui.wallets.hidden = true;
  if (!list.length) {
    status(
      isSol
        ? 'No Solana wallet in this browser. Scan the code with Phantom, Solflare or Backpack on your phone, or open this page in one of their browsers.'
        : 'No Ethereum wallet in this browser. Scan the code with MetaMask, Rabby or Robinhood Wallet on your phone, or open this page in its browser.',
      { kind: 'note' },
    );
    return;
  }
  if (list.length === 1) return run(m, list[0], u);
  status('');
  ui.wallets.replaceChildren(
    h('p', { class: 'tip__k' }, 'pick a wallet'),
    ...list.map((w) =>
      h('button', { class: 'btn', type: 'button', onclick: () => ((ui.wallets.hidden = true), run(m, w, u)) },
        w.icon ? h('img', { src: w.icon, alt: '', width: 20, height: 20 }) : null,
        w.name,
      ),
    ),
  );
  ui.wallets.hidden = false;
  ui.wallets.querySelector('button')?.focus();
}

async function run(m, wallet, u) {
  const coin = state.coin;
  const chain = state.chain;
  const ex = coin === 'SOL' ? sol.explorer : chain.explorer;
  const amount = `${fromUnits(u, cfg().decimals)} ${coin}`;
  state.busy = true;
  render();
  const step = (text, url) => status(text, { kind: 'busy', url, label: ex.name });
  try {
    const r = coin === 'SOL' ? await m.send(wallet, u, step) : await m.send(wallet, u, chain, step);
    if (r.done) status(`Thank you! ${amount} landed${coin === 'ETH' ? ` on ${chain.label}` : ''}. It means a lot.`, { kind: 'ok', url: r.url, label: ex.name });
    else if (r.failed) status('The network ran it but it failed, so nothing was sent.', { kind: 'err', url: r.url, label: ex.name });
    else status('Sent, but it hasn’t confirmed yet. It may still land.', { kind: 'note', url: r.url, label: ex.name });
  } catch (e) {
    const w = why(e);
    status(w.text, { kind: w.cancelled ? 'note' : 'err' });
  } finally {
    state.busy = false;
    render();
  }
}

export function open() {
  if (!dlg) build();
  render();
  if (!dlg.open) dlg.showModal();
}
